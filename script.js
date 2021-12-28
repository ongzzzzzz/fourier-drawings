// https://github.com/trozler/myFourierEpicycles 
// https://replit.com/@Fogeinator/fourier-transform
// 3b1b vid: https://www.youtube.com/watch?v=r6sGWTCMz2k
// codingtrain vid: https://www.youtube.com/watch?v=Mm2eYfj0SgA

let coeffs = {};

async function setup() {
	createCanvas(windowWidth, windowHeight);
	
	let res = await fetch("https://fourier-frontend.fogeinator.repl.co/coeffs.json");
	coeffs = await res.json();

	coeffs = Object.entries(coeffs)
		.sort((a, b) => b[1][0] - a[1][0])
}

let SCALE = 5;
let t = 0;
let graph = {};

let prevRe = 0, prevIm = 0;

function draw() {
	background("BLACK");
	noFill();
	stroke("GREEN")
	ellipse(mouseX, mouseY, 25, 25);

	// calc point at time t
	let c = { re: 0, im: 0 };
	prevRe = 0, prevIm = 0;

	if (coeffs[0] !== undefined) {
		translate(width / 2, height / 2);

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
			ellipse(prevRe, prevIm, 2 * len(p.re, p.im)) // idk why but i guess this works
			prevRe += p.re; prevIm += p.im;
		})

		// // increasing n
		// for (let n = -N; n <= N; n++) {
		// 	// p = C_n * exp(i*2pi*n*t)
		// 	//   = R_n * exp(i*2pi*n*t + i*P_n)

		// 	let p = e(SCALE * coeffs[n][0], coeffs[n][1] + 2 * PI * n * t);
		// 	c.re += p.re; c.im += p.im;

		// 	// draw radius lines (rotating ones)
		// 	stroke("WHITE")
		// 	line(prevRe, prevIm, prevRe + p.re, prevIm + p.im);

		// 	stroke(color("rgba(64, 220, 255, 0.3)")) // light blue
		// 	ellipse(prevRe, prevIm, 2 * len(p.re, p.im)) // idk why but i guess this works
		// 	prevRe += p.re; prevIm += p.im;
		// }


		// update points on graph
		graph[t] = c;

		// draw graph
		// stroke("GREEN")
		// line(0, 0, c.re, c.im);
		stroke("YELLOW")
		beginShape();
		Object.values(graph).forEach(c => vertex(c.re, c.im))
		endShape();


		// time step
		t += 0.001;
		if (t > 1) {
			t -= 1;
			graph = {}; // draw again
		}

	}
}

function e(r, t) {
	return {
		re: r * cos(t),
		im: r * sin(t)
	}
}

function len(re, im) {
	return Math.sqrt(re * re + im * im);
}