export function slackDecode (encoded) {
    let decoded = encoded;
    let matches = decoded.match(/\&lt\;.*?\&gt\;/g) || [];
    for (const match of matches) {
        let value = match.substring(1, match.length - 1).split('|').reverse()[0];
        decoded = decoded.replace(match, value);
    }
    decoded = decoded.replace(/\&amp\;/g, '&').replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>');
    return decoded;
}