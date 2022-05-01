import fs from 'fs';

export default function env () {
    const raw = fs.readFileSync('.env.json', 'utf8');
    const json = JSON.parse(raw);
    for (const key in json) {
        process.env[key] = json[key];
    }
    return json;
}

env();