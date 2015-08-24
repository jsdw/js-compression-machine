# Compression Machine

Learning about certain compression algorithms, I was inspired to implement some of them in JavaScript and see what they could do. This was one of the projects I wrote back in 2012 while learning JavaScript.

Read more [here](http://unbui.lt/#!/post/compression-machine/)

See the in-browser compression algorithms in action [here](https://jsdw.github.io/js-fractal-explorer/)

## Algorithms implemented

- Sequitur
- Burrows-Wheeler Transform
- Move to Front Transform
- Huffman Coding

## Usage

1. Click "compress" to compress some stuff or "decompress" if you want to decompress something previously compressed from this page.
2. Click "options" to configure the compression algorithm used and some basic parameters.
    - The input block size determines how much to read into memory at a time
    - The output block size detemrines how much data will be used together during each compression pass. More data means more compression but also more work to be done (especially for MTF, which is nonlinear in performance w.r.t the block size!).
    - Sequitur has a rule utility setting. This denotes how "valuable" a rule is, ie whether it will be kept or discarded. Keeping a rule can mean less repetition, but on the flip side more new symbols required to represent that repetition.
3. Add files. The progress bar tracks compression. Note that the MTF (+ BWT) algorithm can take rather a long time on certain files, but sequitur should be quite linear.
4. After the progress bar has finished, a finalisation pass needs to take place. When this completes (see the log messages at the bottom), clicking "Next" will list the output ".jam" file. This downloads from a blob URI, which may not be supported on all browsers (this tech was in flux at the time of creating this probably!), but should work at least on Chrome.
