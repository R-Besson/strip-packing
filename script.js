/* ------------------------------------------------------------------------------------

Author  : Romain Besson

Date    : 10/24/2021

Publish : 10/27/2021

------------------------------------------------------------------------------------ */


// _G Variables //
let options = {
    canRotate: false,
    width: 0,
    randomNumber: 1, // random Number option for random generator
}
let outputFields = {}

let inProgress = false

let g_Holes = []
let g_Rectangles = []

const INFINITY = 10**10
// ---------------- //


// _G Elements //
let main = document.querySelector("main");
let state = document.getElementById("status");

let canvas = document.getElementById("output-canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

let canvasCTX = canvas.getContext('2d');
let gridWidth = document.getElementById("width-value");
let gridHeight = document.getElementById("height-value");

let outputBox = document.getElementById("output-box");
let outputRectanglesBox = document.getElementById("output-boxes");
let outputRectangles = document.getElementById("outputRectangles");
let coordinateBox = document.getElementById('box-coordinates');
// --------------- //


// Classes //
class Rectangle {
    constructor(x1, y1, x2, y2, id, origin) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.id = id;
        this.origin = origin;
    }
}

class Hole {
    constructor(x1, y1, x2, y2, id, origin) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.id = id;
        this.origin = origin;
    }
}
// ------- //


// Output Info //
let info = Array.from(document.getElementsByClassName('output-info'))

info.forEach(element => {
    outputFields[element.attributes.name.value] = element
})
// ----------- //


// Toggle Input //
let toggles = Array.from(document.getElementsByClassName('switch'))

toggles.forEach(element => {
    element.children[0].addEventListener("click", () => {
        const option = element.attributes.option.value
        options[option] = !options[option]
    })
})
// ------------ //


// Text-Box Input //
let textBoxes = Array.from(document.getElementsByClassName('input-box'))

textBoxes.forEach(element => {
    element.addEventListener("input", () => {
        const option = element.attributes.option.value
        if (element.value) {
            element.value = clamp(parseInt(element.value), parseInt(element.attributes.min.value), parseInt(element.attributes.max.value))
            options[option] = parseInt(capNumber(element.value, 0))
        } else options[option] = 0
    })
})
// -------------- //


function randomizeCoords() {
    let coords = ""
    for (let i = 0; i < options.randomNumber; i++) {
        coords = `${coords + Random(99)}, ${Random(99)}`
        if (i !== options.randomNumber - 1) coords = `${coords}\n`
    }
    coordinateBox.value = coords
}

// Main Function(s) //
function fitIn(shape1, shape2) {
    // Check if shape1 fits in shape2
    // ONLY by comparing their Widths and Heights AND
    // Not their actual 2D positions

    const shape1W = (shape1.x2 - shape1.x1)
    const shape1H = (shape1.y2 - shape1.y1)

    const shape2W = (shape2.x2 - shape2.x1)
    const shape2H = (shape2.y2 - shape2.y1)

    if (
        shape1W < shape2W &&  // shape1's width is smaller than shape2's width AND
        shape1H < shape2H     // shape1's height is smaller than shape2's height
    ) {
        return true // shape1 is smaller than shape2 (fits in by size)
    }
    return false // shape1 is bigger or equal to shape2
}

function _fitIn(shape1, shape2) {
    // Check if shape1 fits in shape2
    // By comparing all of the corners of shape1

    if (
        shape1.x1 >= shape2.x1 && // Top Left Corner of shape1 is inside shape2
        shape1.y1 >= shape2.y1 && //

        shape1.x2 <= shape2.x2 && // Bottom Right of shape1 is inside shape2
        shape1.y2 <= shape2.y2 // Therefore, a boundary is formed for shape1 only using 2 corners of shape2
    ) {
        return true // shape1 is inside shape2
    }
    return false // shape1 is not inside shape2
}

function holeCovered(hole, exception, holes) {

    // Iterates through all the holes (Array Pointer) and checks if it is covered by a hole AND
    // We also pass an argument 'exception' if we are for example: Breaking a Hole into new Holes

    for (let hid = 0; hid < holes.length; hid++) { // Check through all holes if hole1 is inside/covered (by) it
        let hole2 = holes[hid]

        if (hole2 !== exception && _fitIn(hole, hole2)) return true // hole1 acts as rectangle in this case
    }

    return false
}

function rotateRectangle(rectangle) { // Returns the inverse of specified rectangle in W&H

    let newRectangle = new Rectangle( // We make a copy of rectangle to make sure we don't
        rectangle.x1,                 // change the original rectangle (Pointer) passed as an argument
        rectangle.y1,
        rectangle.x2,
        rectangle.y2,
        rectangle.id,
        rectangle.origin
    )

    const x2 = newRectangle.x2
    const y2 = newRectangle.y2

    newRectangle.x2 = y2
    newRectangle.y2 = x2

    return newRectangle
}

function removeHole(hole, holes) { // Removes a hole from specified Array (Pointer)
    let newHoles = []
    for (let hid = 0; hid < holes.length; hid++) {
        if (holes[hid] !== hole) {
            newHoles.push(holes[hid])
        }
    }
    holes = newHoles
}

function addNewHole(newHole, holes) {
    newHole.id = holes.length + 1
    holes[holes.length] = newHole
}

function calculateHeight(rectangle, hole) {
    return hole.y1 + (rectangle.y2 - rectangle.y1)
}

function createNewHoles(rectangle, hole, holes) {
    // Create new holes from a Placement / Overlapping
    // ⬛ => Hole
    // ⬜ => Rectangle
    // So we enumerate all the 15 cases where the Rectangle can clip inside the Hole


    let caseMet = false

    // ⬜⬜⬜
    // ⬜⬜⬜
    // ⬜⬜⬜
    // [CASE 1]: Perfect fit!
    if (
        !caseMet &&
        rectangle.x1 === hole.x1 && // Rectangle's Left Vertical Edge is on the hole's Left Vertical Edge
        rectangle.y1 === hole.y1 && // Rectangle's Top Horizontal Edge is on the hole's Top Horizontal Edge
        rectangle.x2 === hole.x2 && // Rectangle's Right Vertical Edge is on the hole's Right Vertical Edge
        rectangle.y2 === hole.y2    // Rectangle's Bottom Horizontal Edge is on the hole's Bottom Horizontal Edge
    ) {
        caseMet = true // Only case where we add 0 Holes
    }
    //

    // ⬜⬜⬜
    // ⬛⬛⬛
    // ⬛⬛⬛
    // [CASE 2]: Top Bar Horizontal
    if (
        !caseMet &&
        rectangle.x1 <= hole.x1 && // Rectangle's Left Vertical Edge is left to the hole AND

        rectangle.y1 <= hole.y1 && // Rectangle's Top Horizontal Edge is above the hole AND

        rectangle.x2 >= hole.x2 && // Rectangle's Right Vertical Edge is right to the hole AND

        rectangle.y2 > hole.y1 && // Rectangle's Bottom Horizontal Edge passes through the hole
        rectangle.y2 < hole.y2    //
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, rectangle.y2, hole.x2, hole.y2, 0, 2) // We set Id of hole to 0 since we change it in the addNewHole func.
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }             // 2 is the origin case for this hole therefore: [CASE 2]
    }
    //

    // ⬛⬛⬜
    // ⬛⬛⬜
    // ⬛⬛⬜
    // [CASE 3]: Right Bar Vertical
    if (
        !caseMet &&
        rectangle.x1 > hole.x1 && // Rectangle's Left Vertical Edge passes through the hole AND
        rectangle.x1 < hole.x2 && // 

        rectangle.y1 <= hole.y1 && // Rectangle's Top Horizontal Edge is above the hole AND

        rectangle.x2 >= hole.x2 && // Rectangle's Right Vertical Edge is right to the hole AND

        rectangle.y2 >= hole.y2 // Rectangle's Bottom Horizontal Edge is below the hole
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, rectangle.x1, hole.y2, 0, 3)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }
    }
    //

    // ⬛⬛⬛
    // ⬛⬛⬛
    // ⬜⬜⬜
    // [CASE 4]: Bottom Bar Horizontal
    if (
        !caseMet &&
        rectangle.x1 <= hole.x1 && // Rectangle's Left Vertical Edge is left to the hole AND

        rectangle.y1 > hole.y1 && // Rectangle's Top Horizontal Edge passes through the hole AND
        rectangle.y1 < hole.y2 && //

        rectangle.x2 >= hole.x2 && // Rectangle's Right Vertical Edge is right to the hole AND

        rectangle.y2 >= hole.y2 // Rectangle's Bottom Horizontal Edge is below the hole
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, hole.x2, rectangle.y1, 0, 4)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }
    }
    //

    // ⬜⬛⬛
    // ⬜⬛⬛
    // ⬜⬛⬛
    // [CASE 5]: Left Bar Vertical
    if (
        !caseMet &&
        rectangle.x1 <= hole.x1 && // Rectangle's Left Vertical Edge is left to the hole AND

        rectangle.y1 <= hole.y1 && // Rectangle's Top Horizontal Edge is above the hole AND

        rectangle.x2 > hole.x1 && // Rectangle's Right Vertical Edge passes through the hole AND
        rectangle.x2 < hole.x2 && //

        rectangle.y2 >= hole.y2 // Rectangle's Bottom Horizontal Edge is below the hole
    ) {
        caseMet = true

        let newHole1 = new Hole(rectangle.x2, hole.y1, hole.x2, hole.y2, 0, 5)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }
    }
    //

    // ⬜⬛⬛
    // ⬛⬛⬛
    // ⬛⬛⬛
    // [CASE 6]: Top Left Corner
    if (
        !caseMet &&
        rectangle.x1 <= hole.x1 && // Rectangle's Left Vertical Edge is left to the hole AND

        rectangle.y1 <= hole.y1 && // Rectangle's Top Horizontal Edge is above the hole AND

        rectangle.x2 > hole.x1 && // Rectangle's Right Vertical Edge passes through the hole AND
        rectangle.x2 < hole.x2 && // 

        rectangle.y2 > hole.y1 && // Rectangle's Bottom Horizontal Edge passes through the hole
        rectangle.y2 < hole.y2    //
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, rectangle.y2, hole.x2, hole.y2, 0, 6)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(rectangle.x2, hole.y1, hole.x2, hole.y2, 0, 6)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }
    }
    //

    // ⬛⬛⬜
    // ⬛⬛⬛
    // ⬛⬛⬛
    // [CASE 7]: Top Right Corner
    if (
        !caseMet &&
        rectangle.x1 > hole.x1 && // Rectangle's Left Vertical Edge Crosses in the hole AND
        rectangle.x1 < hole.x2 && // 

        rectangle.y1 <= hole.y1 && // Rectangle's Top Horizontal Edge is above the hole AND

        rectangle.x2 > hole.x1 && // Rectangle's Right Vertical Edge is right to the hole AND
        rectangle.x2 >= hole.x2 && // 

        rectangle.y2 > hole.y1 && // Rectangle's Bottom Horizontal Edge passes through the Hole
        rectangle.y2 < hole.y2    //
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, rectangle.x1, hole.y2, 0, 7)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(hole.x1, rectangle.y2, hole.x2, hole.y2, 0, 7)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }
    }
    //

    // ⬛⬛⬛
    // ⬛⬛⬛
    // ⬛⬛⬜
    // [CASE 8]: Bottom Right Corner
    if (
        !caseMet &&

        rectangle.x1 < hole.x2 && // Rectangle's Left Vertical Edge passes through the hole AND
        rectangle.x1 > hole.x1 && //

        rectangle.y1 > hole.y1 && // Rectangle's Top Horizontal Edge passes through the hole AND
        rectangle.y1 < hole.y2 && //

        rectangle.x2 >= hole.x2 && // Rectangle's Right Vertical Edge is right to the hole AND

        rectangle.y2 >= hole.y2 // Rectangle's Bottom Horizontal Edge is below the hole
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, hole.x2, rectangle.y1, 0, 8)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(hole.x1, hole.y1, rectangle.x1, hole.y2, 0, 8)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }
    }

    // ⬛⬛⬛
    // ⬛⬛⬛
    // ⬜⬛⬛
    // [CASE 9]: Bottom Left Corner
    if (
        !caseMet &&

        rectangle.x1 <= hole.x1 && // Rectangle's Left Vertical Edge is left to the hole AND

        rectangle.y1 > hole.y1 && // Rectangle's Top Horizontal Edge passes through the hole AND
        rectangle.y1 < hole.y2 && //

        rectangle.x2 > hole.x1 && // Rectangle's Right Vertical Edge passes through the hole AND 
        rectangle.x2 < hole.x2 && // 

        rectangle.y2 >= hole.y2 // Rectangle's Bottom Horizontal Edge passes through the hole
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, hole.x2, rectangle.y1, 0, 9)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(rectangle.x2, hole.y1, hole.x2, hole.y2, 0, 9)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }
    }

    // ⬛⬜⬛
    // ⬛⬜⬛
    // ⬛⬜⬛
    // [CASE 10]: Middle Vertical Bar
    if (
        !caseMet &&

        rectangle.x1 > hole.x1 && // Rectangle's Left Vertical Edge passes through the hole AND
        rectangle.x1 < hole.x2 && //

        rectangle.y1 <= hole.y1 && // Rectangle's Top Horizontal Edge is above the hole AND

        rectangle.x2 > hole.x1 && // Rectangle's Right Vertical Edge passes through the hole AND
        rectangle.x2 < hole.x2 && //

        rectangle.y2 >= hole.y2 // Rectangle's Bottom Horizontal Edge is below the hole
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, rectangle.x1, hole.y2, 0, 10)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(rectangle.x2, hole.y1, hole.x2, hole.y2, 0, 10)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }
    }

    // ⬛⬛⬛
    // ⬜⬜⬜
    // ⬛⬛⬛
    // [CASE 11]: Middle Horizontal Bar
    if (
        !caseMet &&

        rectangle.x1 <= hole.x1 && // Rectangle's Left Vertical Edge is left to the hole AND

        rectangle.y1 > hole.y1 && // Rectangle's Top Horizontal Edge passes through the hole AND
        rectangle.y1 < hole.y2 && //

        rectangle.x2 >= hole.x2 && // Rectangle's Right Vertical Edge if right to the hole AND

        rectangle.y2 > hole.y1 && // Rectangle's Bottom Horizontal Edge is below the hole
        rectangle.y2 < hole.y2    //
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, hole.x2, rectangle.y1, 0, 11)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(hole.x1, rectangle.y2, hole.x2, hole.y2, 0, 11)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }
    }

    // ⬛⬜⬛
    // ⬛⬛⬛
    // ⬛⬛⬛
    // [CASE 12]: Top Rectangle Pop-Out
    if (
        !caseMet &&

        rectangle.x1 > hole.x1 && // Rectangle's Left Vertical Edge passes through the hole AND
        rectangle.x1 < hole.x2 && //

        rectangle.y1 <= hole.y1 && // Rectangle's Top Horizontal Edge is above the hole AND

        rectangle.x2 > hole.x1 && // Rectangle's Right Vertical Edge pases through the hole AND
        rectangle.x2 < hole.x2 && //

        rectangle.y2 > hole.y1 && // Rectangle's Bottom Horizontal Edge passes through the hole
        rectangle.y2 < hole.y2    //
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, rectangle.x1, hole.y2, 0, 12)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(hole.x1, rectangle.y2, hole.x2, hole.y2, 0, 12)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }

        let newHole3 = new Hole(rectangle.x2, hole.y1, hole.x2, hole.y2, 0, 12)
        if (!holeCovered(newHole3, hole, holes)) { addNewHole(newHole3, holes) }
    }

    // ⬛⬛⬛
    // ⬛⬛⬜
    // ⬛⬛⬛
    // [CASE 13]: Right Rectangle Pop-Out
    if (
        !caseMet &&

        rectangle.x1 > hole.x1 && // Rectangle's Left Vertical Edge passes through the hole AND
        rectangle.x1 < hole.x2 && //

        rectangle.y1 > hole.y1 && // Rectangle's Top Horizontal Edge passes through the hole AND
        rectangle.y1 < hole.y2 && //

        rectangle.x2 >= hole.x2 && // Rectangle's Right Vertical Edge is right to the hole AND

        rectangle.y2 > hole.y1 && // Rectangle's Bottom Horizontal Edge is below the hole
        rectangle.y2 < hole.y2    //
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, hole.x2, rectangle.y1, 0, 13)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(hole.x1, hole.y1, rectangle.x1, hole.y2, 0, 13)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }

        let newHole3 = new Hole(hole.x1, rectangle.y2, hole.x2, hole.y2, 0, 13)
        if (!holeCovered(newHole3, hole, holes)) { addNewHole(newHole3, holes) }
    }

    // ⬛⬛⬛
    // ⬛⬛⬛
    // ⬛⬜⬛
    // [CASE 14]: Bottom Rectangle Pop-Out
    if (
        !caseMet &&

        rectangle.x1 > hole.x1 && // Rectangle's Left Vertical Edge passes through the hole AND
        rectangle.x1 < hole.x2 && //

        rectangle.y1 > hole.y1 && // Rectangle's Top Horizontal Edge passes through the hole AND
        rectangle.y1 < hole.y2 && // 

        rectangle.x2 > hole.x1 && // Rectangle's Right Vertical Edge passes through the hole AND
        rectangle.x2 < hole.x2 && //

        rectangle.y2 >= hole.y2 // Rectangle's Bottom Horizontal Edge is below the hole
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, rectangle.x1, hole.y2, 0, 14)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(hole.x1, hole.y1, hole.x2, rectangle.y1, 0, 14)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }

        let newHole3 = new Hole(rectangle.x2, hole.y1, hole.x2, hole.y2, 0, 14)
        if (!holeCovered(newHole3, hole, holes)) { addNewHole(newHole3, holes) }
    }

    // ⬛⬛⬛
    // ⬜⬛⬛
    // ⬛⬛⬛
    // [CASE 15]: Left Rectangle Pop-Out
    if (
        !caseMet &&

        rectangle.x1 <= hole.x1 && // Rectangle's Left Vertical Edge is left to the hole AND

        rectangle.y1 > hole.y1 && // Rectangle's Top Horizontal Edge passes through the hole AND
        rectangle.y1 < hole.y2 && //

        rectangle.x2 > hole.x1 && // Rectangle's Bottom Horizontal Edge passes through the hole AND
        rectangle.x2 < hole.x2 && //

        rectangle.y2 > hole.y1 && // Rectangle's Right Vertical Edge passes through the hole
        rectangle.y2 < hole.y2    //
    ) {
        caseMet = true

        let newHole1 = new Hole(hole.x1, hole.y1, hole.x2, rectangle.y1, 0, 15)
        if (!holeCovered(newHole1, hole, holes)) { addNewHole(newHole1, holes) }

        let newHole2 = new Hole(rectangle.x2, hole.y1, hole.x2, hole.y2, 0, 15)
        if (!holeCovered(newHole2, hole, holes)) { addNewHole(newHole2, holes) }

        let newHole3 = new Hole(hole.x1, rectangle.y2, hole.x2, hole.y2, 0, 15)
        if (!holeCovered(newHole3, hole, holes)) { addNewHole(newHole3, holes) }
    }


    // Delete previous completed Hole //
    if (caseMet) {
        removeHole(hole, holes) // Remove Hole since we broke it into multiple holes
        g_Holes = sortByHeight(g_Holes) // Re-sort new holes (favor holes that are at the top because they have the least risk to increase canvas Height)
        return true
    }
    return false // We return false (SHOULD never happen) signifying we failed to place Rectangle in Hole
}

function overlap(rectangle, hole) {
    // Check corners //
        // Check top left corner
        if (
            (rectangle.x1 > hole.x1) &&
            (rectangle.x1 < hole.x2) &&
            (rectangle.y1 > hole.y1) &&
            (rectangle.y1 < hole.y2)
        ) {
            return true
        }

        // Check top right corner
        if (
            (rectangle.x2 > hole.x1) &&
            (rectangle.x2 < hole.x2) &&
            (rectangle.y1 > hole.y1) &&
            (rectangle.y1 < hole.y2)
        ) {
            return true
        }

        // Check bottom left corner
        if (
            (rectangle.x1 > hole.x1) &&
            (rectangle.x1 < hole.x2) &&
            (rectangle.y2 > hole.y1) &&
            (rectangle.y2 < hole.y2)
        ) {
            return true
        }

        // Check bottom right corner
        if (
            (rectangle.x2 > hole.x1) &&
            (rectangle.x2 < hole.x2) &&
            (rectangle.y2 > hole.y1) &&
            (rectangle.y2 < hole.y2)
        ) {
            return true
        }
    // ------------- //


    // Check Edges don't overlap //
        // Check if the top horizontal edge of the rectangle passes through the hole
        if (
            (rectangle.x1 < hole.x2) &&
            (rectangle.x2 > hole.x1) &&
            (rectangle.y1 >= hole.y1) &&
            (rectangle.y1 < hole.y2)
        ) {
            return true
        }

        // Check if the bottom horizontal edge of the rectangle passes through the hole
        if (
            (rectangle.x1 < hole.x2) &&
            (rectangle.x2 > hole.x1) &&
            (rectangle.y2 <= hole.y2) &&
            (rectangle.y2 > hole.y1)
        ) {
            return true
        }

        // Check if the left vertical edge of the rectangle passes through the hole
        if (
            (rectangle.y1 < hole.y2) &&
            (rectangle.y2 > hole.y1) &&
            (rectangle.x1 < hole.x2) &&
            (rectangle.x1 >= hole.x1)
        ) {
            return true
        }

        // Check if the right vertical edge of the rectangle passes through the hole
        if (
            (rectangle.y1 < hole.y2) &&
            (rectangle.y2 > hole.y1) &&
            (rectangle.x2 <= hole.x2) &&
            (rectangle.x2 > hole.x1)
        ) {
            return true
        }
    // ------------------------- //


    return false // No overlap detected
}

function getBestHole(rectangle, method, canRotate) {

    let bestHole = null
    let doRotation = false

    if (method === 1) { // [METHOD 1]: Choose hole that makes canvas height the smallest

        let lowestHeight = Infinity
        for (let hid = 0; hid < g_Holes.length; hid++) {

            // Check Normal Rotation //
            const normalFits = fitIn(rectangle, g_Holes[hid])        // Check that the Normal Rectangle Orientation fits in the Hole
            const normalH = calculateHeight(rectangle, g_Holes[hid]) // Get the Height increase for the Rectangle based on Hole's location

            if (normalFits && normalH < lowestHeight) { // Check that Height increase is worthy of this Hole
                lowestHeight = normalH
                bestHole = g_Holes[hid]
                doRotation = false
            }
            // --------------------- //


            // Check Rotated Solution //
            const rotationFits = fitIn(rotateRectangle(rectangle), g_Holes[hid])        // Check that the Rotated Rectangle fits in the Hole (IMPORTANT that rotateRectangle() doesn't rotate the actual Rectangle arg (Pointer))
            const rotationH = calculateHeight(rotateRectangle(rectangle), g_Holes[hid]) // Get the Height increase for the Rotated Rectangle based on Hole's location

            if (canRotate && rotationFits && rotationH < lowestHeight) { // Check that Rotated Height is worthy of the rectangle being rotated
                lowestHeight = rotationH
                bestHole = g_Holes[hid]
                doRotation = true
            }
            // ---------------------- //

        }

    } else if (method === 2) { // [METHOD 2]: Choose Highest hole in Y position

        let highestY = Infinity

        for (let hid = 0; hid < g_Holes.length; hid++) {
            if (g_Holes[hid].y1 < highestY) {

                if (!fitIn(rectangle, g_Holes[hid])) {

                    if (canRotate && fitIn(rotateRectangle(rectangle), g_Holes[hid])) {
                        doRotation = true

                        highestY = g_Holes[hid].y1
                        bestHole = g_Holes[hid]
                    }

                } else {

                    if (canRotate && fitIn(rotateRectangle(rectangle), g_Holes[hid]) && rotateRectangle(rectangle).y2 < rectangle.y2) {
                        doRotation = true
                    }

                    highestY = g_Holes[hid].y1
                    bestHole = g_Holes[hid]
                }
            }
        }

    } else if (method === 3) { // [METHOD 3]: Choose the Hole that matches the most with the Rectangle (least difference in W&H)

        const rectA = (rectangle.x2 - rectangle.x1) * (INFINITY-rectangle.y1)
        let lowestADiff = Infinity

        for (let hid = 0; hid < g_Holes.length; hid++) {
            const holeA = (g_Holes[hid].x2 - g_Holes[hid].x1) * (INFINITY-g_Holes[hid].y1)
            if (Math.abs(holeA - rectA) < lowestADiff) {
                lowestADiff = Math.abs(holeA - rectA)
                bestHole = g_Holes[hid]
            }
        }

    }

    return { bestHole: bestHole, doRotation: doRotation }
}

function Main() {
    if (!inProgress) {
        clearCanvas() // Reset Canvas of Rectangles & Text
        inProgress = true // Stop user from Stopping Current Sort or Starting a New Sort, etc ...

        // Indicate USER that we have started Main //
        state.attributes.style.value = "color:rgb(0, 255, 0)"
        state.innerHTML = "Working"
        // -------------------------------------------- //

        // Check Width //
        if (options.width === 0) {
            state.attributes.style.value = "color:rgb(255, 0, 0)"
            state.innerHTML = "Failed: Width is 0"
            inProgress = false

            return setTimeout(() => { if (!inProgress) { Reset() } }, 2000)
        }
        //

        // Check Format + Format Box Coords //
        let boxes = processCoords(coordinateBox.value)
        if (!boxes.success) {
            state.attributes.style.value = "color:rgb(255, 0, 0)"
            state.innerHTML = "Failed: Wrong Format"
            inProgress = false

            return setTimeout(() => { if (!inProgress) { Reset() } }, 2000)
        }
        // -------------------------------- //


        // Current Sort/Session Info //
        let sessionInfo = {
            CanRotate: options.canRotate,
            Width: options.width,

            StartTime: 0,
            EndTime: 0,
            RunTime: 0
        }
        // ---------------- //


        // Set Global Arrays //
        g_Rectangles = sortByArea(boxes.coords) // Iterate over the biggest rectangles first
        g_Holes = [new Hole(0, 0, sessionInfo.Width, INFINITY, 1, 0)] // First hole the size of the Infinity with origin Zero as break Case Origin
        // ----------------- //


        // Check if Solve is Possible //
        for (let rid = 0; rid < g_Rectangles.length; rid++) {
            if (g_Rectangles[rid].x2 - g_Rectangles[rid].x1 > 1000 || g_Rectangles[rid].y2 - g_Rectangles[rid].y1 > 1000) {
                state.attributes.style.value = "color:rgb(255, 0, 0)"
                state.innerHTML = `Failed: Box n°${g_Rectangles[rid].id} is too big.`
                inProgress = false

                return setTimeout(() => { if (!inProgress) { Reset() } }, 2000)
            }

            if (g_Rectangles[rid].x2 - g_Rectangles[rid].x1 > sessionInfo.Width && g_Rectangles[rid].y2 - g_Rectangles[rid].y1 > sessionInfo.Width || (!sessionInfo.CanRotate && g_Rectangles[rid].x2 - g_Rectangles[rid].x1 > sessionInfo.Width)) {
                state.attributes.style.value = "color:rgb(255, 0, 0)"
                state.innerHTML = `Failed: Box n°${g_Rectangles[rid].id} is too big.`
                inProgress = false

                return setTimeout(() => { if (!inProgress) { Reset() } }, 2000)
            }
        }
        // -------------------------- //


        sessionInfo.StartTime = performance.now()
        // Start Main Iteration over Rectangles //
        for (let rid = 0; rid < g_Rectangles.length; rid++) {
            let res = getBestHole(g_Rectangles[rid], 1, sessionInfo.CanRotate)

            if (res.bestHole !== null) { // Mainly for debugging, this SHOULD never occur ...
                let bestHole = res.bestHole

                if (res.doRotation) { // If Best Hole needs rotation of rectangle --> rotate Current Rectangle
                    g_Rectangles[rid] = rotateRectangle(g_Rectangles[rid])
                }

                // Place Current Rectangle in Best Hole //
                const w = (g_Rectangles[rid].x2 - g_Rectangles[rid].x1)
                const h = (g_Rectangles[rid].y2 - g_Rectangles[rid].y1)

                g_Rectangles[rid].x2 = bestHole.x1 + w
                g_Rectangles[rid].y2 = bestHole.y1 + h

                g_Rectangles[rid].x1 = bestHole.x1
                g_Rectangles[rid].y1 = bestHole.y1
                // ----------------------------------- //


                g_Rectangles[rid].origin = bestHole.origin // Debugging purposes to test cases that are most redundant, or faulty

                let newHoles = [] // New array that will overwrite the current g_Holes

                for (let hid = 0; hid < g_Holes.length; hid++) {
                    if (overlap(g_Rectangles[rid], g_Holes[hid])) { // If the Current Rectangle overlaps with a hole, we break the hole into new holes ...

                        if (!createNewHoles(g_Rectangles[rid], g_Holes[hid], newHoles)) {
                            state.attributes.style.value = "color:rgb(255, 0, 0)"
                            state.innerHTML = "Failed: Couldn't place rectangle n°" + g_Rectangles[rid].id
                            inProgress = false

                            return setTimeout(() => { if (!inProgress) { Reset() } }, 2000)
                        }

                    } else { // if it doesn't overlap, we add the hole to the newHoles overwrite array
                        newHoles[newHoles.length] = g_Holes[hid]
                    }
                }
                g_Holes = sortByHeight(newHoles)

                if (!createNewHoles(g_Rectangles[rid], bestHole, g_Holes)) {
                    state.attributes.style.value = "color:rgb(255, 0, 0)"
                    state.innerHTML = "Failed: Couldn't place rectangle n°" + g_Rectangles[rid].id
                    inProgress = false

                    return setTimeout(() => { if (!inProgress) { Reset() } }, 2000)
                }

                g_Holes = sortByHeight(g_Holes)

            } else { // If we can't find a Best Hole for a rectangle (should never happen), we abort since it's an abnormal case
                state.attributes.style.value = "color:rgb(255, 0, 0)"
                state.innerHTML = "Failed: Couldn't find hole for rectangle n°" + g_Rectangles[rid].id
                inProgress = false

                return setTimeout(() => { if (!inProgress) { Reset() } }, 2000)
            }
        }
        // End Main For Loop //

        // Show Run Time (Time it took to calculate position + orientation of all holes) //
        sessionInfo.EndTime = performance.now()
        sessionInfo.RunTime = capNumber((sessionInfo.EndTime - sessionInfo.StartTime) / 1000, 3)
        if (sessionInfo.RunTime < 60) {
            outputFields.runTime.innerHTML = sessionInfo.RunTime + " s"
        } else {
            const inMinutes = capNumber(sessionInfo.RunTime / 60, 0)
            const inSeconds = capNumber((sessionInfo.RunTime / 60) - inMinutes, 2)
            outputFields.runTime.innerHTML = inMinutes + " m " + inSeconds + " s"
        }
        // ----------------------------------------------------------------------------- //


        g_Rectangles = sortByY(g_Rectangles) // Sort Rectangles In Order they appear on screen (User Friendly Display Method)

        // Get Canvas Height + Rectangles Combined Area //
        let endRectArea = 0
        let shortestHeight = 0
        g_Rectangles.forEach(rectangle => {
            const w = (rectangle.x2 - rectangle.x1)
            const h = (rectangle.y2 - rectangle.y1)

            endRectArea = endRectArea + w * h

            if (rectangle.y2 > shortestHeight) {
                shortestHeight = rectangle.y2
            }
        })
        // ------------------------------ //

        
        // (Show + Scale) Height On Canvas //
        canvas.style.height = shortestHeight * 2 + "px"
        canvas.height = canvas.clientHeight

        gridHeight.style.marginTop = shortestHeight * 2 + 18 + "px"

        gridHeight.innerHTML = shortestHeight
        const newHeight = (2 - Math.round(gridHeight.getBoundingClientRect().width) / 2).toString()
        gridHeight.style.marginLeft = Math.floor(newHeight) + "px"
        // ------------------------------ //


        // (Show + Scale) Width On Canvas //
        canvas.style.width = sessionInfo.Width * 2 + "px"
        canvas.width = canvas.clientWidth

        gridWidth.innerHTML = sessionInfo.Width
        const newWidth = (sessionInfo.Width * 2 - Math.round(gridWidth.getBoundingClientRect().width) / 2).toString()
        gridWidth.style.marginLeft = Math.floor(newWidth) + "px"

        outputBox.style.marginLeft = sessionInfo.Width * 2 + 310 + "px"
        outputRectanglesBox.style.marginLeft = sessionInfo.Width * 2 + 310 + "px"
        // ------------------------------ //


        // Calculate Theoretical Minimum Height //

        // To Calculate the Theoretical Minimum Height:
        // 1) We have all the rectangles so we accumulate their Area (W*H)
        // 2) And then we divide it by the input width the user has given ...
        //    since H of rectangle is A/W

        let minHeight = 0
        g_Rectangles.forEach(rectangle => {
            const w = rectangle.x2 - rectangle.x1
            const h = rectangle.y2 - rectangle.y1
            minHeight = minHeight + w * h
        });
        minHeight = minHeight / sessionInfo.Width
        outputFields.theoreticalMinHeight.innerHTML = Math.round(minHeight) // Display It

        // ------------------------------------ //


        // Draw + Show Rectangles // 
        outputRectangles.innerHTML = "<p></p><p></p>"
        g_Rectangles.forEach(rectangle => {
            const w = (rectangle.x2 - rectangle.x1)
            const h = (rectangle.y2 - rectangle.y1)

            outputRectangles.innerHTML = `${outputRectangles.innerHTML + rectangle.id}'${scaleString(rectangle.id, 3)}&nbsp;:&nbsp;&nbsp;${w}${scaleString(w, 3)} (width) x ${h}${scaleString(h, 3)} (height)  [ ${rectangle.x1}${scaleString(rectangle.x1, 5)},  ${rectangle.y1}${scaleString(rectangle.y1, 5)}, ${rectangle.x2}${scaleString(rectangle.x2, 5)}, ${rectangle.y2}${scaleString(rectangle.y2, 5)}]<p></p><p></p>`

            let nRectangle = new Rectangle(rectangle.x1 * 2, rectangle.y1 * 2, rectangle.x2 * 2, rectangle.y2 * 2, rectangle.id, rectangle.origin)
            drawRectangle(nRectangle)
        })
        // ---------------------- //


        let endCanvasArea = shortestHeight * sessionInfo.Width // Show Result Height found
        outputFields.endHeight.innerHTML = shortestHeight      //

        outputFields.percLost.innerHTML = capNumber((endCanvasArea - endRectArea) / endCanvasArea * 100, 3) + " %" // Show Rectangle (green) repartition in % over the canvas AND
        outputFields.percUsed.innerHTML = capNumber((endRectArea) / endCanvasArea * 100, 3) + " %"                 // Show Holes (gray) repartition in % over the canvas

        g_Rectangles = [] // Reset both global arrays back to empty
        g_Holes = []      //

        inProgress = false // End of Sort
        state.attributes.style.value = "color:rgb(0, 255, 0)"
        state.innerHTML = "Done!"
    }
}

function Reset() {
    if (!inProgress) {
        g_Rectangles = []
        g_Holes = []

        // (Reset + Scale) Canvas //
        clearCanvas()

        outputBox.style.marginLeft = 642 + "px"
        outputRectanglesBox.style.marginLeft = 642 + "px"

        canvas.style.height = 532 + "px"
        canvas.height = canvas.clientHeight

        canvas.style.width = 332 + "px"
        canvas.width = canvas.clientWidth
        //

        // Reset Output Fields //
        outputRectangles.innerHTML = ""
        for (field in outputFields) {
            outputFields[field].innerHTML = "NaN"
        }
        //

        // (Reset + Scale) Width On Canvas //
        gridWidth.innerHTML = 0
        const newWidth = (332 - Math.round(gridWidth.getBoundingClientRect().width) / 2).toString()
        gridWidth.style.marginLeft = Math.floor(newWidth) + "px"
        //

        // (Reset + Scale) Height On Canvas //
        gridHeight.style.marginTop = 550 + "px"
        gridHeight.innerHTML = 0
        const newHeight = (2 - Math.round(gridHeight.getBoundingClientRect().width) / 2).toString()
        gridHeight.style.marginLeft = Math.floor(newHeight) + "px"
        //

        // Reset Status to Idle + Wait for new Sorting //
        state.attributes.style.value = "color:rgb(255, 255, 0)"
        state.innerHTML = "Idle"
        inProgress = false
        //
    }
}
//

// Base Functions //
let mergeSortComparison = (a, b) => {
    return a[0] > b[0]
}

// Sorting //
function sortByArea(tbl) { // Sort table by rectangle Area Size
    mergeSortComparison = (a, b) => {
        const aw = a[0].x2 - a[0].x1
        const ah = a[0].y2 - a[0].y1

        const bw = b[0].x2 - b[0].x1
        const bh = b[0].y2 - b[0].y1

        return aw * ah < bw * bh
    }
    return mergeSort(tbl)
}

function sortByWHDifference(tbl) {
    mergeSortComparison = (a, b) => {
        const aw = a[0].x2 - a[0].x1
        const ah = a[0].y2 - a[0].y1

        const bw = b[0].x2 - b[0].x1
        const bh = b[0].y2 - b[0].y1

        return Math.abs(aw - ah) > Math.abs(bw - bh)
    }
    return mergeSort(tbl)
}

function sortByHeight(tbl) {
    mergeSortComparison = (a, b) => {
        return Math.abs(a[0].y2) > Math.abs(b[0].y2)
    }
    return mergeSort(tbl)
}

function sortByY(tbl) {
    mergeSortComparison = (a, b) => {
        return Math.abs(a[0].y1) > Math.abs(b[0].y1)
    }
    return mergeSort(tbl)
}

function sortById(tbl) {
    mergeSortComparison = (a, b) => {
        return a[0].id > b[0].id
    }
    return mergeSort(tbl)
}
//

// Merge Sort //
function mergeArrays(a, b) {
    const c = []

    while (a.length && b.length) {
        c.push(mergeSortComparison(a, b) ? b.shift() : a.shift())
    }

    // Add remaining values to end of c
    while (a.length) {
        c.push(a.shift())
    }
    while (b.length) {
        c.push(b.shift())
    }

    return c
}

function mergeSort(a) {
    if (a.length <= 1) return a // Check Length of Array

    const middle = Math.floor(a.length / 2) // We do Math.floor for left to be smaller

    const left = a.slice(0, middle)
    const right = a.slice(middle, a.length)

    const sorted_left = mergeSort(left)
    const sorted_right = mergeSort(right)

    return mergeArrays(sorted_left, sorted_right)
}
// ---------- //


// Base Functions //
function capNumber(n, d) { // Cap Number to d decimals
    const f = 10 ** d
    return (Math.round(n * f) / f).toFixed(d)
}

function magnitude(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max)
}

function Random(max) {
    return clamp(Math.floor(Math.random() * max), 10, Infinity);
}

function scaleString(string, n) {
    let space = ""
    for (let i = 0; i < n - string.toString().length; i++) { space = space + "&nbsp;" }
    return space
}
// -------------- //


// Essentials //
function processCoords(inputCoords) {
    if (inputCoords === "" || inputCoords.length < 4) return { success: false, message: "c1" }

    let coords = []
    let current = new Rectangle(0, 0, 0, 0, 0, 0)
    let switcher = 'x2'
    let check = false

    for (let i = 0; i < inputCoords.length; i++) {
        const n = inputCoords[i]

        if (n === ",") {
            if (switcher === 'x2') { switcher = 'y2' } else { switcher = 'x2' }

            if (check) return { success: false, message: "2" }
            check = true

            if (i === inputCoords.length - 1) return { success: false, message: "c3" }
        } else if (n === "\n") {
            if (!parseInt(current.x2) || !parseInt(current.y2)) return { success: false, message: "c3" }

            if (!check) return { success: false, message: "c4" }
            check = false

            current.id = coords.length + 1

            current.x2 = parseInt(current.x2); current.y2 = parseInt(current.y2)
            coords[coords.length] = current
            current = new Rectangle(0, 0, 0, 0, 0, 0)
            switcher = 'x2'

            if (i === inputCoords.length - 1) return { success: false, message: "c5" }
        } else if (n !== " ") {
            if (!parseInt(n) && n !== "0") return { success: false, message: "c6" }

            if (!current[switcher]) current[switcher] = ""
            current[switcher] = current[switcher] + n
        }

        if (i === inputCoords.length - 1 && parseInt(current.x2) && parseInt(current.y2)) {
            current.x2 = parseInt(current.x2); current.y2 = parseInt(current.y2)

            current.id = coords.length + 1

            coords[coords.length] = current
        }
    }

    for (let i = 0; i < coords.length; i++) {
        const w = coords[i].x2
        const h = coords[i].y2

        coords[i].x1 = -INFINITY
        coords[i].y1 = -INFINITY

        coords[i].x2 = -INFINITY+w
        coords[i].y2 = -INFINITY+h
    }

    return { success: true, coords: coords }
}

function clearCanvas() {
    canvasCTX.clearRect(0, 0, canvas.width, canvas.height);
}

function _drawText(x, y, text, font) { // Draw Text on Canvas
    canvasCTX.fillStyle = "rgb(0,0,0)"
    canvasCTX.font = font || "14px Arial";
    canvasCTX.fillText(text, x, y);
}
function _drawRectangle(x, y, w, h, fill, stroke) {
    canvasCTX.fillStyle = fill || "rgb(255,255,255)";
    canvasCTX.strokeStyle = stroke || "rgb(0, 0, 0)"
    canvasCTX.lineWidth = 1
    canvasCTX.fillRect(x, y, w, h);
    canvasCTX.strokeRect(x, y, w, h)
}

function getRandomColor() {
    color = "hsl(" + Math.random() * 360 + ", 100%, 70%)";
    return color;
}

function drawRectangle(shape) {
    const x = shape.x1
    const y = shape.y1
    const w = shape.x2 - shape.x1
    const h = shape.y2 - shape.y1

    _drawRectangle(x, y, w, h, getRandomColor(), "rgb(50, 50, 50)") // Draw Rectangle

    // Calculate Width + Height for TXT //
    const wx = x + w / 2 - 8
    const wy = y + 10

    const hx = x + 2
    const hy = y + h / 2 + 4

    const idx = x + w / 2 - 8
    const idy = y + h / 2 + 4
    // -------------------------------- //

    // Draw Text //
    if (magnitude(wx, wy, idx, idy) > 16 && magnitude(hx, hy, idx, idy) > 16) { // Overlap Checker
        _drawText(wx, wy, Math.round(w / 2).toString(), "10px Arial") // Width
        _drawText(hx, hy, Math.round(h / 2).toString(), "10px Arial") // Height
        _drawText(idx + 3 - shape.id.toString().length*2, idy - 1, shape.id.toString()) // ID
    } else _drawText(idx + 4 - shape.id.toString().length*2, idy - 1, shape.id.toString(), "12px Arial") // ID
    // --------- //
}
// ---------- //
