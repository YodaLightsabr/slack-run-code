import env from './env.js';
import fetch from 'node-fetch';
import piston from 'piston-client';
import { reactions, react, staticReact } from './reactions.js';
import SlackBolt from '@slack/bolt';
import SlackWebAPI from '@slack/web-api';

const { App } = SlackBolt;
const { WebClient } = SlackWebAPI;

const cachedChannels = [];

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
});

const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const pistonClient = piston({ server: "https://emkc.org" });

let versions = {};
let languages = [];

async function messageResponse ({ message, say, addReaction }) {
    const { loading, thumbsUp, failed, welcome } = staticReact();

    let language, code;

    if (message.files && message.files[0] && message.files[0].url_private_download) {        
        await addReaction({
            channel: message.channel,
            timestamp: message.ts,
            name: loading
        });

        code = await fetch(message.files[0].url_private_download, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
            }
        }).then(res => res.text());
        language = message.files[0].filetype;
        if (!languages.includes(language)) language = message.files[0].name.split('.').reverse()[0];

    } else {

        if (!message.text.includes('```') && message.text.toLowerCase().includes('language') && (
            message.text.toLowerCase().includes('pls') ||
            message.text.toLowerCase().includes('list')
        )) { // Are they looking for the language list?

            const runtimes = await pistonClient.runtimes();
            
            let messages = [];

            messages.push({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": ":cat_typing: Here are some languages you can use with Code Bot:"
                        }
                    }
                ], thread_ts: message.ts
            });

            for (const runtime of runtimes) {
                if (messages[messages.length - 1].blocks.length >= 48) messages.push({ blocks: [], thread_ts: message.ts });
                messages[messages.length - 1].blocks = [
                    ...messages[messages.length - 1].blocks,
                    ...(messages[messages.length - 1].blocks.length ? [{
                        "type": "divider"
                    }] : []),
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": `${runtime.language} - v${runtime.version}`,
                            "emoji": true
                        }
                    },
                    ...(runtime.aliases.length ? [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `Aliases: ${runtime.aliases.map(a => '`' + a + '`').join(', ')}`
                            }
                        }
                    ] : []) // Sorry whoever's reading this syntax
                ]
            }

            await addReaction({
                channel: message.channel,
                timestamp: message.ts,
                name: thumbsUp
            });

            for (const message of messages) {
                await say(message);
            }
            return;
        }

        const isCodeRegex = /.*?(\n| |){1,3}```(.|\n)*?```/;
        if (isCodeRegex.test(message.text)) { // is a valid code snippet

            await addReaction({
                channel: message.channel,
                timestamp: message.ts,
                name: loading
            });

            code = message.text.substring(
                message.text.indexOf('```') + 3,
                message.text.lastIndexOf('```')
            );
            language = message.text.match(/.*/)[0];

        } else {
            return await addReaction({
                channel: message.channel,
                timestamp: message.ts,
                name: failed
            });
        }
    }

    if (!languages.includes(language)) {
        web.reactions.remove({
            channel: message.channel,
            timestamp: message.ts,
            name: loading
        });
        addReaction({
            channel: message.channel,
            timestamp: message.ts,
            name: failed
        });
        return;
    }

    console.log(`Running ${code} in ${language} container`);
    const result = await pistonClient.execute(language, code, {
        version: versions[language]
    });

    if (result.run.output) await web.files.upload({
        thread_ts: message.thread_ts ? message.thread_ts : message.ts, // support for threaded shortcuts
        content: result.run.output,
        channels: message.channel,
        title: 'output.txt',
        filetype: 'text',
        initial_comment: `${result.language} v${result.version} exited with code \`${result.run.code}\``
    });
    else say({ text: `${result.language} v${result.version} exited with code \`${result.run.code}\``, thread_ts: message.ts });

    web.reactions.remove({
        channel: message.channel,
        timestamp: message.ts,
        name: loading
    });

    addReaction({
        channel: message.channel,
        timestamp: message.ts,
        name: thumbsUp
    });
}

app.message(async ({ message, say }) => {
    if (message.channel != 'C03E0TFT649') return console.log('Ignoring unrelated message');
    if (message.thread_ts && (message.thread_ts != message.ts)) return console.log('Ignoring threaded message');

    if (message.subtype === 'channel_join') {
        console.log('Reacting to and ignoring channel join message');

        await web.reactions.add({
            channel: message.channel,
            timestamp: message.ts,
            name: welcome
        });
        return;
    }

    if (message.subtype === 'message_changed') return console.log('Ignoring edited message'); // maybe implement in the future?
    if (message.text && (message.text.startsWith('#') || message.text.startsWith('//'))) return console.log('Ignoring comment message');


    await messageResponse({ message, say, addReaction: web.reactions.add });
});

app.shortcut('run_code', async ({ shortcut, ack, client, logger }) => {
    console.log('Received shortcut');
    await ack();
    shortcut.message.channel = shortcut.channel.id;
    if (!cachedChannels.includes(shortcut.channel.id)) { // it's okay if it warns you're in the channel once,
        await web.conversations.join({         // but prevent it from happening twice to avoid ratelimits
            channel: shortcut.channel.id
        });
        cachedChannels.push(shortcut.channel.id);
    }
    await messageResponse({
        message: shortcut.message,
        say: async data => {
            return await web.chat.postMessage({
                channel: shortcut.channel.id,
                timestamp: shortcut.message.ts,
                ...data
            });
        },
        addReaction: web.reactions.add
        // addReaction: async ({ name }) => {
        //     return await web.chat.postMessage({
        //         channel: shortcut.channel.id,
        //         timestamp: shortcut.message.ts,
        //         text: `:${name}:`
        //     });
        // }
    });
});

(async () => {
    const runtimes = await pistonClient.runtimes();
    for (const runtime of runtimes) {
        languages.push(runtime.language);
        languages.push(...runtime.aliases);
        versions[runtime.language] = runtime.version;
        runtime.aliases.forEach(a => versions[a] = runtime.version);
    }
    await app.start();
    console.log('⚡️ Bolt app started');
})();
