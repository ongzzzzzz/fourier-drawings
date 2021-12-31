let selection = document.getElementById("selection");
let settings = document.getElementById("settings");

let fileinp = document.getElementById("fileinp");
let filebutton = document.getElementById("filebutton");
let fileview = document.getElementById("fileview");
let svgdiv = document.getElementById("svgdiv");
let drawbutton = document.getElementById("drawbutton");
let presetinp = document.getElementById("presetinp");
let presetbutton = document.getElementById("presetbutton");
let presetview = document.getElementById("presetview");

let EXTREMASCALE = 3
function createSettings() {
	scaleSlider = createSlider(-EXTREMASCALE, EXTREMASCALE, 1, 0)
	scaleSlider.style("width", "15em");
	scaleLabel = createDiv(`Change scale: ${round(scaleSlider.value(), 2)}`);
	speedSlider = createSlider(0.001, 0.01, 0.001, 0);
	speedSlider.style("width", "15em");
	speedLabel = createDiv(`Change speed:`);
	sortCheckbox = createCheckbox("Sort by radius", true);
	redrawButton = createButton("Redraw");

	scaleLabel.parent("settings");
	scaleSlider.parent("settings");
	speedLabel.parent("settings");
	speedSlider.parent("settings");
	sortCheckbox.parent("settings");
	redrawButton.parent("settings");

	sortCheckbox.changed(() => {
		if (sortCheckbox.checked()) {
			coeffs = sorted_coeffs;
			console.log("using sorted")
			console.log(coeffs === sorted_coeffs)
			console.log(coeffs === unsorted_coeffs)
		}
		else {
			coeffs = unsorted_coeffs;
			console.log("using unsorted")
			console.log(coeffs === sorted_coeffs)
			console.log(coeffs === unsorted_coeffs)

		}
	})

	redrawButton.mousePressed(async () => {
		graph = {};
		noLoop();
		selection.style.display = "flex"; settings.style.display = "none";
		coeffs = await getCoeffs();
		selection.style.display = "none"; settings.style.display = "flex";
		loop();
	})
}

let N_coeff = 50;

async function processInput() {
	fileinp.addEventListener("change", function () {
		fileview.src = URL.createObjectURL(this.files[0])
	})
	presetinp.addEventListener("change", function () { presetview.src = `https://fourier-frontend.fogeinator.repl.co/presets/${this.value}.svg`; })

	return new Promise((resolve, reject) => {
		filebutton.addEventListener("click", () => {
			let files = fileinp.files;
			if (files.length === 0) { alert("choose an SVG file first~") }
			else { resolve(["file", files[0]]) }
		})

		presetbutton.addEventListener("click", () => {
			let choice = presetinp.value;
			resolve(["preset", choice])
		})

		drawbutton.addEventListener("click", () => { resolve(["draw"]) })
	})
}





async function getCoeffs() {
	let coeffs = {};

	let [inptype, ...data] = await processInput();
	console.log(data)

	if (inptype === "file") {
		// create svg in DOM
		let parser = new DOMParser();
		// console.log(fileview.src)
		let svg = await fetch(fileview.src).then(res => res.text())
			.then(text => {
				let parsed = parser.parseFromString(text, 'text/html');
				let svg = parsed.querySelector("svg");
				svgdiv.replaceChild(svg, svgdiv.childNodes[0])
				return svg;
			})
		// sample coords from the SVG
		let samples = await sampleSvg(svg);
		// find coefficients
		coeffs = await calculateCoeffs(samples);
		// rescale according to radius
		rescale(coeffs);
	}
	if (inptype === "draw") {
		// hide selection and settings
		selection.style.display = "none"; settings.style.display = "none";
		background("BLACK")

		// let user draw, collect samples
		disableScroll();
		let samples = await sampleDrawing();
		enableScroll();

		// calculate and return coeffs
		coeffs = await calculateCoeffs(samples, skipZero = false);

		rescale(1);
	}
	if (inptype === "preset") {
		let res = await fetch(`https://fourier-frontend.fogeinator.repl.co/presets/${data}.json`);
		coeffs = await res.json();

		// rescale according to radius
		rescale(coeffs);
	}

	// sort by increasing n
	unsorted_coeffs = Object.entries(coeffs)
		.sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
	
	// deep copy and sort by largest radius
	sorted_coeffs = JSON.parse(JSON.stringify(unsorted_coeffs))
		.sort((a, b) => b[1][0] - a[1][0])

	// restart animation
	t = 0;
	if (sortCheckbox.checked()) return sorted_coeffs;
	else return unsorted_coeffs;
}





async function sampleSvg(svg) {
	let samples = []
	let N_s = 100 // number of samples PER PATH
	let inc = 1 / N_s;

	let paths = svg.getElementsByTagName("path");
	for (let i = 0; i < paths.length; i++) {
		let p = paths[i];
		let pLength = p.getTotalLength();

		let curr = 0;
		let point;
		for (let percent = 0; percent < 1; percent += inc) {
			point = p.getPointAtLength(percent * pLength);
			samples.push(point);
		}
	}
	console.log(samples.length, "samples collected from svg")
	return samples;
}





async function sampleDrawing() {
	return new Promise(async (resolve, reject) => {
		let samples = [];
		window.mouseDragged = function () {
			samples.push({ x: mouseX - width / 2, y: mouseY - height / 2 });

			stroke("YELLOW")
			beginShape();
			samples.forEach(s => vertex(s.x, s.y))
			endShape();
		}
		window.mouseReleased = function () {
			window.mouseDragged = function () { }
			window.mouseReleased = function () { }

			resolve(samples);
		}
	})
}





async function calculateCoeffs(samples, skipZero = true) {
	let coeffs = {}

	function fn(t) { return samples[Math.round((samples.length - 1) * t)] }
	let L = 10000;
	let dt = 1 / L;
	let f, r, theta;
	let max_r = 0;

	// for each coefficient
	for (let n = -N_coeff; n <= N_coeff; n++) {
		// center on screen
		if (n == 0 && skipZero) {
			coeffs[n] = [0, 0];
			continue;
		}

		let c_n = { re: 0, im: 0 };
		// do the integral thing (simplified math to have RE and IM part)
		for (let t = 0; t <= 1; t += dt) {
			f = fn(t);
			c_n.re += ((f.x * cos(2 * PI * n * t)) + (f.y * sin(2 * PI * n * t))) * dt;
			c_n.im += ((f.y * cos(2 * PI * n * t)) - (f.x * sin(2 * PI * n * t))) * dt;
		}
		// convert c_n to polar form
		r = len(c_n.re, c_n.im)
		theta = Math.atan2(c_n.im, c_n.re);
		coeffs[n] = [r, theta];
	}
	return coeffs;
}





function rescale(coeffs) {
	if (typeof coeffs === "number") {
		// constant scale
		SCALE = coeffs;
		scaleSlider.value(SCALE)
		scaleLabel.html(`Change scale: ${round(SCALE, 2)}`)
		return;
	}

	// change scale so it fits on screen; 
	// according to test with sandwich.svg, r=200 is perfect max r
	// extrapolate scale, follow 1/x graph
	let max_r = 0;
	Object.values(coeffs).forEach(c => {
		max_r = Math.max(max_r, c[0]);
	})
	console.log("max radius:", max_r);

	SCALE = constrain(200 / max_r, -EXTREMASCALE, EXTREMASCALE);
	console.log("SCALE:", SCALE)
	scaleSlider.value(SCALE)
	scaleLabel.html(`Change scale: ${round(SCALE, 2)}`)
}



function len(re, im) { return Math.sqrt(re * re + im * im); }

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// left: 37, up: 38, right: 39, down: 40,
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
var keys = { 37: 1, 38: 1, 39: 1, 40: 1 };

function preventDefault(e) { e.preventDefault(); }
function preventDefaultForScrollKeys(e) { if (keys[e.keyCode]) { preventDefault(e); return false; } }
// modern Chrome requires { passive: false } when adding event
var supportsPassive = false;
try {
	window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
		get: function () { supportsPassive = true; }
	}));
} catch (e) { }

var wheelOpt = supportsPassive ? { passive: false } : false;
var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

// call this to Disable
function disableScroll() {
	window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
	window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
	window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
	window.addEventListener('keydown', preventDefaultForScrollKeys, false);
}

// call this to Enable
function enableScroll() {
	window.removeEventListener('DOMMouseScroll', preventDefault, false);
	window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
	window.removeEventListener('touchmove', preventDefault, wheelOpt);
	window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
}