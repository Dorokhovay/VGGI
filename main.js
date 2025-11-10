'use strict';

let gl;         
let surfaceMesh; 
let shaderObj;   
let trackball;   

function renderScene() {
    gl.clearColor(0.02, 0.05, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    let projMat = m4.perspective(Math.PI / 8, 1, 8, 12);
    let viewMat = trackball.getViewMatrix();

    let rotMat = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let transMat = m4.translation(0, 0, -10);

    let tmpMat = m4.multiply(rotMat, viewMat);
    let finalMat = m4.multiply(transMat, tmpMat);

    let mvpMat = m4.multiply(projMat, finalMat);

    gl.uniformMatrix4fv(shaderObj.mvpMatrixUniform, false, mvpMat);
    gl.uniform4fv(shaderObj.colorUniform, [0.8, 0.5, 0.02, 0.95]);

    surfaceMesh.render();
}

function generateCassiniMesh() {
    let vertices = [];
    const a = 8;
    const zMin = -8 / 3;
    const zMax = 8 / 3;
    const zSteps = 40;
    const uSteps = 100;
    const scale = 0.15;

    for (let k = 0; k <= zSteps; k++) {
        let z = zMin + k * (zMax - zMin) / zSteps;
        let c = 3 * z;
        for (let i = 0; i <= uSteps; i++) {
            let u = i * 2 * Math.PI / uSteps;
            let cos2u = Math.cos(2 * u);
            let sin2u = Math.sin(2 * u);
            let inner = a ** 4 - (c ** 4) * (sin2u ** 2);
            let r = 0;
            if (inner >= 0) r = Math.sqrt(c * c * cos2u + Math.sqrt(inner));
            let x = scale * r * Math.cos(u);
            let y = scale * r * Math.sin(u);
            vertices.push(x, y, scale * z);
        }
    }

    return {
        vertices: vertices,
        uGrid: { offset: 0, count: vertices.length / 3, verticesPerLine: uSteps + 1, numLines: zSteps + 1 },
        vGrid: { offset: 0, count: vertices.length / 3, verticesPerLine: uSteps + 1, numLines: zSteps + 1 }
    };
}

function setupGL() {
    let program = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

    shaderObj = new GLSLProgram('Main', program);
    shaderObj.activate();

    shaderObj.vertexAttrib = gl.getAttribLocation(program, "vertex");
    shaderObj.mvpMatrixUniform = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    shaderObj.colorUniform = gl.getUniformLocation(program, "color");

    surfaceMesh = new Mesh3D('CassiniSurface');
    const meshData = generateCassiniMesh();
    surfaceMesh.uploadData(meshData.vertices, meshData.uGrid, meshData.vGrid);

    gl.enable(gl.DEPTH_TEST);
}

function createShaderProgram(gl, vSrc, fSrc) {
    let vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vSrc);
    gl.compileShader(vShader);
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        throw new Error("Vertex shader error: " + gl.getShaderInfoLog(vShader));
    }

    let fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fSrc);
    gl.compileShader(fShader);
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        throw new Error("Fragment shader error: " + gl.getShaderInfoLog(fShader));
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) throw "WebGL not supported";
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Could not get WebGL context.</p>";
        return;
    }

    try {
        setupGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>WebGL initialization failed: " + e + "</p>";
        return;
    }

    trackball = new TrackballRotator(canvas, renderScene, 0);
    renderScene();
}
