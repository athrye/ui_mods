Miscellaneous silly or helpful scripts for lichess.

Athrye Kronczyk / 2025

These are all garbage code I threw together for fun

**time_requests.js** -> scans for messages starting with `!t!`, interprets them as requests for time in seconds, and gives said time (rounded up to the nearest increment of 15). For example, `!t!40` would add 45 seconds (3x15s) to the clock. Known limitation: does not yet identify sender.

**image_support.js** -> scans for messages starting with "!i!u|" and renders them inline with chat. For example `i!u|www.whatever.com/someimage.jpg` would render www.whatever.com/someimage.jpg

**memes.js** -> scans for messages starting with `!meme!` and replaces them with urls to the meme. For example, `!meme!elmo!` gets replaced with `!i!u|https://media.tenor.com/jDYNnTW0v9gAAAAM/hellfire.gif`. If you are ALSO running the image script, it would then render an image of the elmo meme.
