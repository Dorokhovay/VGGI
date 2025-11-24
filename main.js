'use strict';


let gl;
let surface;
let shProgram;
let spaceball;
let zoom = 80.0;
let uSteps = 100; 
let vSteps = 20;
let renderMode = "fill";
let lightSphere;


function deg2rad(angle) { return angle * Math.PI / 180; }


function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer(); 
    this.iWireIndexBuffer = gl.createBuffer();
    this.indexCount = 0;
    this.primitive = gl.TRIANGLES;

    this.BufferData = function(vertices, indices, wireIndices, normals) { 
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);
        this.fillIndexCount = indices.length;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iWireIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireIndices), gl.STREAM_DRAW);
        this.wireIndexCount = wireIndices.length;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        if (renderMode === "fill") {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
            gl.drawElements(gl.TRIANGLES, this.fillIndexCount, gl.UNSIGNED_SHORT, 0);
        } else { 
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iWireIndexBuffer);
            gl.drawElements(gl.LINES, this.wireIndexCount, gl.UNSIGNED_SHORT, 0);
        }
    }
}


function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iAttribNormal = -1; 

    this.iProjectionMatrix = -1;  
    this.iModelViewMatrix = -1;     
    this.iNormalMatrix = -1;        
    this.iLightPosition = -1;    
    this.iWireframeColor = -1;    
    this.iRenderMode = -1;    

    this.Use = function() { gl.useProgram(this.prog); }
}


function draw() {
    requestAnimationFrame(draw);

    resizeCanvasToDisplaySize(gl.canvas);
    gl.clearColor(0.02, 0.05, 0.2, 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);


    let projection = m4.perspective(Math.PI / 8, gl.canvas.clientWidth / gl.canvas.clientHeight, 5, 2000);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
    
    let viewMatrix = spaceball.getViewMatrix();
    let rotateToVertical = m4.axisRotation([1, 0, 0], Math.PI / 2);
    viewMatrix = m4.multiply(rotateToVertical, viewMatrix);
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -zoom);
    viewMatrix = m4.multiply(rotateToPointZero, viewMatrix);
    viewMatrix = m4.multiply(translateToPointZero, viewMatrix);

    const time = performance.now() * 0.0005;
    const lightRadius = 10.0;
    const worldLightPos = [ 
        
        Math.cos(time) * lightRadius, 
        
        Math.sin(time) * lightRadius,
         -10.0,
        
    ];

    const viewLightPos = m4.transformPoint(viewMatrix, worldLightPos);
    gl.uniform3fv(shProgram.iLightPosition, viewLightPos);
    gl.uniform4fv(shProgram.iWireframeColor, [0.8, 0.5, 0.02, 1.0]); 

    
    gl.uniform1i(shProgram.iRenderMode, renderMode === "fill" ? 0 : 1);
    
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, viewMatrix);
        
    surface.Draw();

    
    gl.uniform1i(shProgram.iRenderMode, 2);

    let sphereModelMatrix = m4.translation(worldLightPos[0], worldLightPos[1], worldLightPos[2]);
    
    let sphereModelViewMatrix = m4.multiply(viewMatrix, sphereModelMatrix);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, sphereModelViewMatrix);

    let sphereNormalMatrix = m4.transpose(m4.inverse(sphereModelViewMatrix));
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, sphereNormalMatrix);

    lightSphere.Draw();
}


function CreateSurfaceData() {
    let vertices = [];
    let indices = [];
    let wireIndices = [];
    let normals = [];
    let flip = []; 

    let a = 8;
    let zMin = -8 / 3;
    let zMax = 8 / 3;

    let zStepsLocal = vSteps;
    let uStepsLocal = uSteps;

    let scale = 1;

    function P(u, z) {
        let c = 3 * z;
        let cos2u = Math.cos(2 * u);
        let sin2u = Math.sin(2 * u);

        let inner = a ** 4 - (c ** 4) * (sin2u ** 2);

        let r = 0;
        if (inner >= 0) r = Math.sqrt(c * c * cos2u + Math.sqrt(inner));

        let x = scale * r * Math.cos(u);
        let y = scale * r * Math.sin(u);
        let zz = scale * z;

        return { pos: [x, y, zz], flip: (inner >= 0 && r > 0) ? 1 : -1 };
    }

    for (let k = 0; k <= zStepsLocal; k++) {
        let z = zMin + k * (zMax - zMin) / zStepsLocal;

        for (let i = 0; i <= uStepsLocal; i++) {
            let u = i * 2 * Math.PI / uStepsLocal;
            let p = P(u, z);
            vertices.push(...p.pos);
            flip.push(p.flip);
        }
    }

    let vertsPerRow = uStepsLocal + 1;

    for (let k = 0; k < zStepsLocal; k++) {
        for (let i = 0; i < uStepsLocal; i++) {

            let p0 = k * vertsPerRow + i;
            let p1 = p0 + 1;
            let p2 = p0 + vertsPerRow;
            let p3 = p2 + 1;

            let f = flip[p0] + flip[p1] + flip[p2] + flip[p3];

            if (f > 0) {
                indices.push(p0, p1, p2);
                indices.push(p1, p3, p2);
            } else {
                indices.push(p0, p2, p1);
                indices.push(p1, p2, p3);
            }

            wireIndices.push(p0, p1);
            wireIndices.push(p1, p3);
            wireIndices.push(p3, p2);
            wireIndices.push(p2, p0);
        }
    }

    // ---------- NORMALS ----------
    const numVerts = vertices.length / 3;
    let temp = Array(numVerts).fill(0).map(() => [0,0,0]);

    function sub(a,b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
    function cross(a,b) { return [ a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0] ]; }
    function add(a,b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
    function norm(v) {
        let L = Math.hypot(v[0],v[1],v[2]);
        return L > 1e-6 ? [v[0]/L, v[1]/L, v[2]/L] : [0,0,0];
    }

    for (let i = 0; i < indices.length; i += 3) {
        let i0 = indices[i];
        let i1 = indices[i+1];
        let i2 = indices[i+2];

        let p0 = vertices.slice(i0*3, i0*3+3);
        let p1 = vertices.slice(i1*3, i1*3+3);
        let p2 = vertices.slice(i2*3, i2*3+3);

        let edge1 = sub(p1, p0);
        let edge2 = sub(p2, p0);

        let n = cross(edge1, edge2); 

        temp[i0] = add(temp[i0], n);
        temp[i1] = add(temp[i1], n);
        temp[i2] = add(temp[i2], n);
    }

    normals = [];
    for (let v of temp) {
        let nn = norm(v);
        normals.push(nn[0], nn[1], nn[2]);
    }

    return { vertices, indices, wireIndices, normals };
}


function CreateSphereData(radius, latBands, longBands) {
    let vertices = [];
    let indices = [];
    let normals = [];

    for (let lat = 0; lat <= latBands; lat++) {
        let theta = lat * Math.PI / latBands;
        let sinTheta = Math.sin(theta);
        let cosTheta = Math.cos(theta);

        for (let long = 0; long <= longBands; long++) {
            let phi = long * 2 * Math.PI / longBands;
            let sinPhi = Math.sin(phi);
            let cosPhi = Math.cos(phi);

            let x = cosPhi * sinTheta;
            let y = cosTheta;
            let z = sinPhi * sinTheta;

            normals.push(x, y, z);
            
            vertices.push(radius * x, radius * y, radius * z);
        }
    }

    for (let lat = 0; lat < latBands; lat++) {
        for (let long = 0; long < longBands; long++) {
            let first = (lat * (longBands + 1)) + long;
            let second = first + longBands + 1;

            indices.push(first);
            indices.push(second);
            indices.push(first + 1);

            indices.push(second);
            indices.push(second + 1);
            indices.push(first + 1);
        }
    }

    return { 
        vertices: vertices, 
        indices: indices, 
        normals: normals,
        wireIndices: indices 
    };
}


function updateUSteps(value) {
    uSteps = parseInt(value);
    document.getElementById('uSliderValue').textContent = value;
    updateSurface();
}

function updateVSteps(value) {
    vSteps = parseInt(value);
    document.getElementById('vSliderValue').textContent = value;
    updateSurface();
}

function setRenderMode(value) {
    renderMode = value;
    draw();
}

function updateSurface() {
    let data = CreateSurfaceData(); 
    surface.BufferData(data.vertices, data.indices, data.wireIndices, data.normals);
    
}


function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "a_position");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "a_normal");

    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "u_projectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "u_modelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "u_normalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "u_lightPosition");
    shProgram.iWireframeColor = gl.getUniformLocation(prog, "u_wireframeColor");
    shProgram.iRenderMode = gl.getUniformLocation(prog, "u_renderMode"); 

    surface = new Model('Surface');
    let surfaceData = CreateSurfaceData();
    surface.BufferData(surfaceData.vertices, surfaceData.indices, surfaceData.wireIndices, surfaceData.normals);
    

    lightSphere = new Model('LightSphere');
    
    let sphereData = CreateSphereData(0.25, 20, 20); 
    lightSphere.BufferData(sphereData.vertices, sphereData.indices, sphereData.wireIndices, sphereData.normals);
    
}

function resizeCanvasToDisplaySize(canvas) {
    const displayWidth  = canvas.clientWidth * window.devicePixelRatio;
    const displayHeight = canvas.clientHeight * window.devicePixelRatio;

    if (canvas.width  !== displayWidth || canvas.height !== displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}



function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Vertex shader error: " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh,fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Fragment shader error: " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog,fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


function init() {
    let canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    initGL();


    spaceball = new TrackballRotator(canvas, () => {}, 0); 

    canvas.addEventListener("wheel", (event) => {
        zoom += event.deltaY * 0.02;
        if (zoom < 4) zoom = 4;
        if (zoom > 80) zoom = 80;
        event.preventDefault();
    });
    
    window.addEventListener('resize', () => {});

    requestAnimationFrame(draw);
}
