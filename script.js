let sorted_coeffs = {}, unsorted_coeffs = {};
let coeffs = {};

let canvas, scaleLabel, scaleSlider, speedLabel, speedSlider, sortCheckbox, redrawButton;

async function setup() {
	canvas = createCanvas(windowWidth, windowHeight);
	canvas.parent("sketch");
	createSettings();

	noLoop();
	// await user choice (svg // hand draw // preselect)
	coeffs = await getCoeffs();
	// show settings when animation running
	selection.style.display = "none"; settings.style.display = "flex";
	loop();
}

let SCALE = 1;
let t = 0;
let graph = {};

let prevRe = 0, prevIm = 0;

function draw() {
	background("BLACK");
	stroke("GREEN");
	if (mouseIsPressed) fill("GREEN")
	ellipse(mouseX, mouseY, 25, 25);

	noFill();

	// calc point at time t
	let c = { re: 0, im: 0 };
	prevRe = 0, prevIm = 0;

	translate(width / 2, height / 2);
	if (SCALE != scaleSlider.value()) { 
		scaleLabel.html(`Change scale: ${round(scaleSlider.value(), 2)}`)
		for (let i=0; i<Object.keys(graph).length; i++) {
			let graphpoint = graph[ Object.keys(graph)[i] ]
			graphpoint.re *= (scaleSlider.value() / SCALE);
			graphpoint.im *= (scaleSlider.value() / SCALE);
		}
		SCALE = scaleSlider.value();
	}

	// for coeffs sorted by size
	Object.values(coeffs).forEach(v => {
		// p = C_n * exp(i*2pi*n*t)
		//   = R_n * exp(i*2pi*n*t + i*P_n)
		let n = parseInt(v[0]);
		let coeff = v[1]
		let p = e(SCALE * coeff[0], coeff[1] + 2 * PI * n * t);
		c.re += p.re; c.im += p.im;

		// draw radius lines (rotating ones)
		stroke("WHITE")
		line(prevRe, prevIm, prevRe + p.re, prevIm + p.im);

		stroke(color("rgba(64, 220, 255, 0.3)")) // light blue
		ellipse(prevRe, prevIm, 2 * len(p.re, p.im)) // 2*len cus p5js want diameter
		prevRe += p.re; prevIm += p.im;
	})


	// update points on graph
	if (coeffs.length) graph[t] = c;

	// draw graph
	// stroke("GREEN")
	// line(0, 0, c.re, c.im);
	stroke("YELLOW")
	beginShape();
	Object.values(graph).forEach(c => vertex(c.re, c.im))
	endShape();


	// time step
	t += speedSlider.value();
	if (t > 1) {
		t -= 1;
		graph = {}; // draw again
	}
}

function e(r, t) {
	return {
		re: r * cos(t),
		im: r * sin(t)
	}
}


