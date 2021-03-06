const Command = require("../../core/Command");
const request = require("request-promise");
const { RichEmbed } = require("discord.js");

class Cry extends Command {
    constructor(client) {
        super(client, {
            name: "Cry",
            description: "Cry!",
            aliases: []
        });
    }

    async run(message, channel, user) {
        const response = await request({
            headers: { "User-Agent": "Mozilla/5.0" },
            uri: "https://rra.ram.moe/i/r",
            qs: { type: "cry", nsfw: false },
            json: true
        }).catch(error => this.error(error.response.body.error, channel));

        if (!response) return false;

        const embed = new RichEmbed()
            .setColor(this.config.colours.default)
            .setDescription(`**${user.tag}** cried`)
            .setImage(`https://cdn.ram.moe${response.path.replace("i/", "")}`);

        await channel.send({ embed });
        return this.delete(message);
    }
}

module.exports = Cry;
