const Command = require("../../core/Command");
const Database = require("../../core/Database");

function cap(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

class Set extends Command {
    constructor(client) {
        super(client, {
            name: "Set",
            description: "Provide Data to the Database",
            aliases: []
        });
    }

    // Database User Object Template
    static getTemplate() {
        return {
            location: null,
            language: null,
            timezone: null,
            locale: null,
            radar: null
        };
    }

    static async getUser(user) {
        let db = await Database.Models.Users.findOne({ where: { id: user.id } });

        // Preliminary Updates to DB
        if (db) {
            const data = JSON.parse(db.data);
            let update = null;

            // Ensure User Template is up to date
            for (const key in Set.getTemplate()) {
                if (!(key in data)) {
                    update = data;
                    data[key] = Set.getTemplate()[key];
                }
            }

            // Update if needs updating
            if (update) {
                await db.update({ data: JSON.stringify(update) });
            }

            db = await Database.Models.Users.findOne({ where: { id: user.id } });
        }

        // Create User if not exists
        if (!db) {
            await Database.Models.Users.create({ id: user.id, data: JSON.stringify(Set.getTemplate()) });
            db = await Database.Models.Users.findOne({ where: { id: user.id } });
        }

        return db;
    }

    // Database Update Method
    async update(model, data) {
        await model.update({ data: JSON.stringify(data) });
        this.log(JSON.stringify(data), "debug");
        return true;
    }

    async run(message, channel, user, args) {
        const fields = ["location"];
        let field, data, db;

        if (message.pung.length > 0) {
            if (!this.hasAdmin(message.author)) {
                return message.reply("Insufficient Permissions");
            }

            return message.reply("unable to modify other users, feature unimplemented.");
        }

        // No Command Supplied
        if (args.length === 0) {
            await message.reply(`what field would you like to update? Available fields:\`${fields.join(", ")}\`. Expires in 30s.`);
            const filter = msg => msg.author.id === user.id;
            const res = await channel.awaitMessages(filter, { max: 1, time: 30 * 1000 });
            const text = res.first().content;

            if (text.split(" ").length > 1) {
                return message.reply("only expected 1 argument. Cancelling...");
            }

            field = text.split(" ")[0];

            if (fields.indexOf(field) === -1) {
                return message.reply(`${field} is not a valid field!`);
            }

            if (field) {
                await message.reply(`what value would you like to set \`${field}\` to? Expires in 30s.`);
                const filter = msg => msg.author.id === user.id;
                const res = await channel.awaitMessages(filter, { max: 1, time: 30 * 1000 });
                data = res.first().content;
            }
        }

        if (!field && args.length >= 1) field = args[0];
        if (!data && args.length >= 2) data = args.slice(1);

        if (!field || !data) {
            return message.reply("required fields are missing! Try running this command without any arguments for a walkthrough.");
        }

        db = await Set.getUser(user);
        const userdata = JSON.parse(db.data);

        if (field === "radar") {
            const valid = ["sydney", "canberra", "adelaide"];
            const place = data.join(" ").toLowerCase();

            if (!(valid.indexOf(place) >= 0)) {
                return message.reply(`it doesn't look like "${cap(data)}" is a valid radar location.. Available locations include ${valid.join(", ")}`);
            }

            // Set Field
            userdata[field] = place;
            this.update(db, userdata);

            // Done
            this.log(`Updated Entry for ${user.id}`, "debug");
            return message.reply(`successfully set your local radar to ${cap(place)}!`);
        }

        if (field === "location") {
            const { geolocation } = require("../weather/conditions");
            const parsed = await geolocation(data);

            // Handle Error
            if (typeof parsed === "string") {
                return this.error(parsed, channel);
            }

            // Remove Deprecated Weather Field
            delete userdata.weather;

            // Set Location
            userdata[field] = parsed;
            this.update(db, userdata);

            // Done
            this.log(`Updated Entry for ${user.id}`, "debug");
            return message.reply(`successfully set your location to ${parsed.line1}, ${parsed.line2}!`);
        }

        return message.reply("unfortunately it doesn't look like that's a valid field.");
    }
}

module.exports = Set;
