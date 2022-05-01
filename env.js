import fs from 'fs';

export default function env () {
    try {
        const raw = fs.readFileSync('.env.json', 'utf8');
        const json = JSON.parse(raw);
        for (const key in json) {
            process.env[key] = json[key];
        }
        return json;
    } catch (err) {
        return process.env;
    }
}

env();