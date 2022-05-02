export function slackDecode (encoded) {
    let decoded = encoded.replace(/\&amp\;/g, '&').replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>');
    let matches = decoded.match(/<.*?>/g) || [];
    for (const match of matches) {
        let value = match.substring(1, match.length - 1).split('|').reverse()[0];
        decoded = decoded.replace(match, value);
    }
    return decoded;
}