'use strict';

const crypto = require('crypto');
const {
  InteractionTypes,
  InteractionCallbackTypes,
  ApplicationCommandOptionTypes,
} = require('../constants');
const {
  Interaction,
  User,
  Channel,
  GuildRole,
} = require('../structures');
const { BaseClient } = require('./base');

class TypeBuilder {
  constructor(type, description) {
    this.type = type;
    this.description = description;
    this._required = false;
  }

  required(required = true) {
    this._required = required;
    return this;
  }

  serialize() {
    return {
      type: this.type,
      description: this.description,
      required: this._required,
    };
  }
}

const TYPES = {};
Object.entries(ApplicationCommandOptionTypes)
  .forEach(([k, v]) => {
    TYPES[k.toLowerCase()] = (d) => new TypeBuilder(v, d);
  });

class ApplicationCommand {
  constructor(config, handler) {
    this.config = { ...config };
    this.handler = handler;

    if (typeof this.config.options === 'function') {
      const built = this.config.options(TYPES);
      this.config.options = Object.entries(built)
        .map(([k, v]) => ({ name: k, ...v.serialize() }));
    }
  }

  serialize(type) {
    return {
      type,
      ...this.config,
    };
  }
}

class ApplicationCommandGroup {
  constructor(config) {
    this.config = config;
    this.commands = Object.create(null);
  }

  registerGroup(config) {
    const group = new ApplicationCommandGroup(config);
    this.commands[config.name] = group;
    return group;
  }

  register(config, handler) {
    this.commands[config.name] = new ApplicationCommand(config, handler);
  }

  serialize() {
    if (this.config) {
      return {
        name: this.config.name,
        description: 'description',
        options: Object.values(this.commands)
          .map((c) => c.serialize(ApplicationCommandOptionTypes.SUB_COMMAND)),
      };
    }
    const global = [];
    const guild = [];
    Object.values(this.commands)
      .forEach((command) => {
        if (command.config.scope === 'guild') {
          guild.push(command.serialize());
        } else {
          global.push(command.serialize());
        }
      });
    return { global, guild };
  }
}

class ApplicationCommandBuilder {
  constructor(client) {
    this.client = client;

    this.rootGroup = new ApplicationCommandGroup();

    this.guildCommands = undefined;

    this.client.on('GUILD_CREATE', (guild) => {
      if (this.guildCommands.length > 0) {
        guild.setApplicationCommands(this.guildCommands)
          .catch((e) => this.client.emit('error', e));
      }
    });
  }

  announce() {
    const { global, guild } = this.rootGroup.serialize();
    this.guildCommands = guild;

    if (global.length > 0) {
      this.client.setApplicationCommands(global)
        .catch((e) => this.client.emit('error', e));
    }

    if (guild.length > 0 || global.length > 0) {
      this.client.on('INTERACTION_CREATE', async (interaction) => {
        if (interaction.data.type !== InteractionTypes.APPLICATION_COMMAND) {
          return;
        }

        let command;
        let options;
        if (interaction.data.data.name in this.rootGroup.commands) {
          command = this.rootGroup.commands[interaction.data.data.name];
          options = interaction.data.data.options;
          while (command.commands) {
            command = command.commands[options[0].name];
            options = options[0].options;
          }
        }

        if (!command) {
          return;
        }

        const { resolved } = interaction.data.data;
        const asyncOps = [];
        const args = {};
        options?.forEach((option) => {
          switch (option.type) {
            case ApplicationCommandOptionTypes.USER:
              args[option.name] = new User(this.client, resolved.users[option.value]);
              break;
            case ApplicationCommandOptionTypes.ROLE:
              args[option.name] = new GuildRole(this.client, resolved.roles[option.value]);
              break;
            case ApplicationCommandOptionTypes.MENTIONABLE:
              args[option.name] = resolved.users[option.value]
                ? new User(this.client, resolved.users[option.value])
                : new GuildRole(this.client, resolved.roles[option.value]);
              break;
            case ApplicationCommandOptionTypes.CHANNEL:
              asyncOps.push((async () => {
                try {
                  args[option.name] = await this.client.getChannel(option.value);
                } catch {
                  const c = new Channel(this.client, resolved.channels[option.value]);
                  c.data.guild_id ||= interaction.data.guild_id;
                  args[option.name] = c;
                }
              })());
              break;
            default:
              args[option.name] = option.value;
              break;
          }
        });

        await Promise.all(asyncOps);

        await command.handler(interaction, args);
      });
    }
  }

  registerGroup(config) {
    return this.rootGroup.registerGroup(config);
  }

  register(config, handler) {
    return this.rootGroup.register(config, handler);
  }
}

class InteractionClient extends BaseClient {
  constructor(options) {
    super(options);

    this.commands = new ApplicationCommandBuilder(this);

    this.publicKey = crypto.webcrypto.subtle.importKey(
      'raw',
      Buffer.from(options.publicKey, 'hex'),
      {
        name: 'NODE-ED25519',
        namedCurve: 'NODE-ED25519',
        public: true,
      },
      true,
      ['verify'],
    );
  }

  async verify(signature, body, timestamp) {
    signature = Buffer.from(signature);
    const unknown = Buffer.concat([Buffer.from(timestamp), Buffer.from(body)]);
    const publicKey = await this.publicKey;
    const v = await crypto.webcrypto.subtle.verify('NODE-ED25519', publicKey, signature, unknown);
    return v;
  }

  async handle(signature, body, timestamp) {
    if (!await this.verify(signature, body, timestamp)) {
      throw new Error('Invalid payload');
    }

    const data = JSON.parse(body.toString('utf8'));

    if (data.type === InteractionTypes.PING) {
      return {
        type: InteractionCallbackTypes.PONG,
      };
    }

    const result = await new Promise((resolve) => {
      const interaction = new Interaction(this, data, {
        reply: resolve,
      });
      this.emit('INTERACTION_CREATE', interaction);
    });

    return result;
  }
}

module.exports = {
  InteractionClient,
  ApplicationCommandBuilder,
};
