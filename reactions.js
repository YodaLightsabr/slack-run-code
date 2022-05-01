export const reactions = {
    thumbsUp: [
        'sad-cat-thumbs-up',
        'thumb',
        'thumbsup',
        'thumbsup_all',
        'thumbsup-dino',
        'blob_thumbs_up',
        'ok'
    ],
    failed: [
        'x',
        'x',
        'x',
        'x',
        'confused-dino',
        'confused-dino',
        'confused-dino',
        'confused-dino',
        'nooo',
        'ratscream',
        'no-thoughts-head-sad',
        'no',
        'blob-no',
        'tw_no_entry',
        'tw_no_entry',
        'tw_x',
        'x_1',
        'x_x',
        'heavy_multiplication_x',
        'tw_heavy_multiplication_x'
    ],
    loading: [
        'beachball',
        'beachball',
        'beachball',
        'beachball',
        'beachball',
        'loading',
        'thinkspin',
        'thonk-spin',
        'fidget_spinner',
        'fidget_spinner',
        'fidget_spinner'
    ],
    welcome: [
        'wave',
        'wave-pikachu',
        'doggo_wave',
        'hyper-dino-wave',
        'tw_wave',
        'heydino'
    ]
};

export function react (type) {
    return reactions[type][reactions[type].length * Math.random() | 0];
}

export function staticReact () {
    const object = {};
    for (const reaction in reactions) {
        object[reaction] = react(reaction);
    }
    return object;
}