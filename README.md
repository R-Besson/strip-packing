# Strip Packing
[![](https://img.shields.io/badge/Author-Romain%20Besson-brightgreen)](https://github.com/R-Besson) ![](https://img.shields.io/badge/Published-24/10/2021-brightgreen) ![](https://img.shields.io/badge/Started-27/10/2021-brightgreen)
\
This repository contains implementations for the strip packing problem that can be found here: https://en.wikipedia.org/wiki/Strip_packing_problem <br>

The strip packing problem attempts to optimize the placing of rectangles in a strip of fixed width and variable height, such that the overall height of the strip is the smallest possible. <br>

   In this algorithm, I use an ingenious method of placing rectangles inside of Holes. <br>
The first hole starts as the entirety of the strip (with a Height that is negligeable but higher than the height of any rectangle & the theoretical min height of the strip). <br>
As we place the rectangles inside the holes, we break the antecedent hole into new holes using 15 different positional cases, check for overlap, etc ... <br>

The web interface can be found here: https://r-besson.github.io/strip-packing/ <br>
We can choose to rotate rectangles efficiently, or to not do so. We can specify the width of the canvas (strip), generate random boxes, or specify our own boxes.

## License

[![](https://img.shields.io/badge/License-CC%201.0-lightgrey)](https://creativecommons.org/publicdomain/zero/1.0)
