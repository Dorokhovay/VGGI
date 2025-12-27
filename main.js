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

let diffuseTexture = null;
let specularTexture = null;
let normalTexture = null;

let useDiffuseMap = true;
let useSpecularMap = true;
let useNormalMap = true;

let texScaleCenter = { u: 0.5, v: 0.5 }; // центр масштабування
let texScale = 1.0; // коефіцієнт масштабування
const texMoveStep = 0.05; // крок переміщення точки
let centerMarker;

function deg2rad(angle) { return angle * Math.PI / 180; }


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

    // Передаємо центр масштабування в shader
    gl.uniform2f(shProgram.uTexScaleCenter, texScaleCenter.u, texScaleCenter.v);
    gl.uniform1f(shProgram.uTexScale, texScale);
    
    gl.uniform1i(shProgram.iRenderMode, renderMode === "fill" ? 0 : 1);
    
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, viewMatrix);
    
    let surfaceNormalMatrix = m4.transpose(m4.inverse(viewMatrix));
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, surfaceNormalMatrix);

    gl.activeTexture(gl.TEXTURE0);
    if (useDiffuseMap && shProgram.diffuseTexture) {
        gl.bindTexture(gl.TEXTURE_2D, shProgram.diffuseTexture);
    } else {
        gl.bindTexture(gl.TEXTURE_2D, shProgram.whiteTexture);
    }
    gl.uniform1i(shProgram.uDiffuseTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    if (useSpecularMap && shProgram.specularTexture) {
        gl.bindTexture(gl.TEXTURE_2D, shProgram.specularTexture);
    } else {
        gl.bindTexture(gl.TEXTURE_2D, shProgram.whiteTexture);
    }
    gl.uniform1i(shProgram.uSpecularTex, 1);

    gl.activeTexture(gl.TEXTURE2);
    if (useNormalMap && shProgram.normalTexture) {
        gl.bindTexture(gl.TEXTURE_2D, shProgram.normalTexture);
    } else {
        gl.bindTexture(gl.TEXTURE_2D, shProgram.neutralNormalTexture);
    }

    gl.uniform1i(shProgram.uNormalTex, 2);

    
    surface.Draw();

    
    gl.uniform1i(shProgram.iRenderMode, 2);

    let sphereModelMatrix = m4.translation(worldLightPos[0], worldLightPos[1], worldLightPos[2]);
    
    let sphereModelViewMatrix = m4.multiply(viewMatrix, sphereModelMatrix);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, sphereModelViewMatrix);

    let sphereNormalMatrix = m4.transpose(m4.inverse(sphereModelViewMatrix));
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, sphereNormalMatrix);

    lightSphere.Draw();

    // Малювання маркера центру
    gl.uniform1i(shProgram.iRenderMode, 3); // новий режим для маркера
    let centerPos = getPositionAtUV(texScaleCenter.u, texScaleCenter.v);
    let markerModelMatrix = m4.translation(centerPos[0], centerPos[1], centerPos[2]);
    let markerModelViewMatrix = m4.multiply(viewMatrix, markerModelMatrix);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, markerModelViewMatrix);
    let markerNormalMatrix = m4.transpose(m4.inverse(markerModelViewMatrix));
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, markerNormalMatrix);
    
    gl.uniform4fv(shProgram.iWireframeColor, [1.0, 0.0, 0.0, 1.0]); // червоний маркер
    centerMarker.Draw();
}


function CreateSurfaceData() {
    let vertices = [];
    let indices = [];
    let wireIndices = [];
    let normals = [];
    let texcoords = [];
    let tangents = [];
    let bitangents = [];
    let flip = [];

    let a = 8;
    let zMin = -8 / 3;
    let zMax = 8 / 3;

    let zStepsLocal = vSteps;
    let uStepsLocal = uSteps;

    let scale = 1.3;

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
            texcoords.push(i / uStepsLocal, k / zStepsLocal);
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

            wireIndices.push(p0, p1, p1, p3, p3, p2, p2, p0);
        }
    }

    // ---------- NORMALS ----------
    const numVerts = vertices.length / 3;
    let temp = Array.from({ length: numVerts }, () => [0,0,0]);

    function sub(a,b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
    function cross(a,b) { return [ a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0] ]; }
    function add(a,b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
    function norm(v) { let L=Math.hypot(v[0],v[1],v[2]); return L>1e-6?[v[0]/L,v[1]/L,v[2]/L]:[0,0,0]; }

    for (let i = 0; i < indices.length; i += 3) {
        let i0 = indices[i], i1 = indices[i+1], i2 = indices[i+2];
        let p0 = vertices.slice(i0*3,i0*3+3);
        let p1 = vertices.slice(i1*3,i1*3+3);
        let p2 = vertices.slice(i2*3,i2*3+3);

        let n = cross(sub(p1,p0), sub(p2,p0));

        temp[i0] = add(temp[i0], n);
        temp[i1] = add(temp[i1], n);
        temp[i2] = add(temp[i2], n);
    }

    normals = temp.map(v => {
        let nn = norm(v);
        return [nn[0], nn[1], nn[2]];
    }).flat();

    // ---------- TANGENTS & BITANGENTS ----------
    for (let k = 0; k <= zStepsLocal; k++) {
        for (let i = 0; i <= uStepsLocal; i++) {
            let idx = k * vertsPerRow + i;
            let p = vertices.slice(idx*3, idx*3+3);

            let pu = (i < uStepsLocal) ? vertices.slice(idx*3+3, idx*3+6) : vertices.slice(idx*3-3, idx*3);
            let pv = (k < zStepsLocal) ? vertices.slice(idx*3+vertsPerRow*3, idx*3+(vertsPerRow+1)*3)
                                       : vertices.slice(idx*3-vertsPerRow*3, idx*3-vertsPerRow*3+3);

            tangents.push(...norm(sub(pu, p)));
            bitangents.push(...norm(sub(pv, p)));
        }
    }

    return { vertices, indices, wireIndices, normals, texcoords, tangents, bitangents };
}

function CreateMarkerData() {
    // Створюємо маркер
    let vertices = [];
    let indices = [];
    let normals = [];
    
    const size = 0.3;
    vertices = [
        -size, -size, 0,
         size, -size, 0,
         size,  size, 0,
        -size,  size, 0
    ];
    
    indices = [0, 1, 2, 0, 2, 3];
    
    normals = [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ];
    
    return { vertices, indices, wireIndices: indices, normals };
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
    shProgram.activate();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "a_position");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "a_normal");
    
    shProgram.iAttribTexCoord  = gl.getAttribLocation(prog, "a_texcoord");

    shProgram.iAttribTangent   = gl.getAttribLocation(prog, "a_tangent");
    shProgram.iAttribBitangent = gl.getAttribLocation(prog, "a_bitangent");

    shProgram.uTexScaleCenter = gl.getUniformLocation(prog, "u_texScaleCenter");
    shProgram.uTexScale = gl.getUniformLocation(prog, "u_texScale");

    shProgram.uDiffuseTex  = gl.getUniformLocation(prog, "u_diffuseTex");
    shProgram.uSpecularTex = gl.getUniformLocation(prog, "u_specularTex");
    shProgram.uNormalTex   = gl.getUniformLocation(prog, "u_normalTex");

    shProgram.uUseDiffuse = gl.getUniformLocation(prog, "u_useDiffuse");
    shProgram.uUseSpecular = gl.getUniformLocation(prog, "u_useSpecular");
    shProgram.uUseNormal   = gl.getUniformLocation(prog, "u_useNormal");

    const createSolidTexture = (r, g, b, a = 255) => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const data = new Uint8Array([r, g, b, a]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1,1,0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        return tex;
    };

    shProgram.whiteTexture = createSolidTexture(255,255,255,255); 
    shProgram.neutralNormalTexture = createSolidTexture(128,128,255,255);
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "u_projectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "u_modelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "u_normalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "u_lightPosition");
    shProgram.iWireframeColor = gl.getUniformLocation(prog, "u_wireframeColor");
    shProgram.iRenderMode = gl.getUniformLocation(prog, "u_renderMode"); 

    shProgram.diffuseTexture = LoadTexture(gl, "./texture/diff2.jpg");
    shProgram.specularTexture = LoadTexture(gl, "./texture/spec2.jpg");
    shProgram.normalTexture   = LoadTexture(gl, "./texture/norm2.jpg");


    gl.uniform1i(shProgram.uUseDiffuse, 1);
    gl.uniform1i(shProgram.uUseSpecular, 1);
    gl.uniform1i(shProgram.uUseNormal, 1);

    surface = new Model('Surface');
   let surfaceData = CreateSurfaceData();
    surface.BufferData(
    surfaceData.vertices,
    surfaceData.indices,
    surfaceData.wireIndices,
    surfaceData.normals,
    surfaceData.texcoords,
    surfaceData.tangents,
    surfaceData.bitangents
    );

    centerMarker = new Model('CenterMarker');
    let markerData = CreateMarkerData();
    centerMarker.BufferData(
        markerData.vertices, 
        markerData.indices, 
        markerData.wireIndices, 
        markerData.normals
    );

    lightSphere = new Model('LightSphere');
    
    let sphereData = CreateSphereData(0.25, 20, 20); 
    lightSphere.BufferData(sphereData.vertices, sphereData.indices, sphereData.wireIndices, sphereData.normals);
    
}

// Функція для обчислення 3D позиції на поверхні за UV координатами
function getPositionAtUV(u, v) {
    let a = 8;
    let zMin = -8 / 3;
    let zMax = 8 / 3;
    let scale = 1.3;
    
    // Перетворити v [0,1] в z
    let z = zMin + v * (zMax - zMin);
    
    // Перетворити u [0,1] в кут
    let angle = u * 2 * Math.PI;
    
    let c = 3 * z;
    let cos2u = Math.cos(2 * angle);
    let sin2u = Math.sin(2 * angle);
    
    let inner = a ** 4 - (c ** 4) * (sin2u ** 2);
    
    let r = 0;
    if (inner >= 0) r = Math.sqrt(c * c * cos2u + Math.sqrt(inner));
    
    let x = scale * r * Math.cos(angle);
    let y = scale * r * Math.sin(angle);
    let zz = scale * z;
    
    return [x, y, zz];
}

function updateRenderSettings() {
    useDiffuseMap = document.getElementById("useDiffuseMap").checked;
    useSpecularMap = document.getElementById("useSpecularMap").checked;
    useNormalMap   = document.getElementById("useNormalMap").checked;

    gl.useProgram(shProgram.prog);
    gl.uniform1i(shProgram.uUseDiffuse, useDiffuseMap ? 1 : 0);
    gl.uniform1i(shProgram.uUseSpecular, useSpecularMap ? 1 : 0);
    gl.uniform1i(shProgram.uUseNormal, useNormalMap ? 1 : 0);

    draw();
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

    canvas.setAttribute("tabindex", "0");
    canvas.focus();

    setupKeyboardControls();
    updateScaleDisplay();
    

    requestAnimationFrame(draw);
}

function updateCenterU(value) {
    texScaleCenter.u = parseFloat(value);
    document.getElementById('centerU').textContent = texScaleCenter.u.toFixed(2);
}

function updateCenterV(value) {
    texScaleCenter.v = parseFloat(value);
    document.getElementById('centerV').textContent = texScaleCenter.v.toFixed(2);
}

function updateScale(value) {
    texScale = parseFloat(value);
    document.getElementById('scaleValue').textContent = texScale.toFixed(2);
}

function setupKeyboardControls() {
    const canvas = document.getElementById("webglcanvas");

    canvas.setAttribute("tabindex", "0");
    canvas.focus();

    canvas.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyW':
                texScaleCenter.v = Math.max(0, texScaleCenter.v - texMoveStep);
                break;

            case 'KeyS':
                texScaleCenter.v = Math.min(1, texScaleCenter.v + texMoveStep);
                break;

            case 'KeyA':
                texScaleCenter.u = Math.max(0, texScaleCenter.u - texMoveStep);
                break;

            case 'KeyD':
                texScaleCenter.u = Math.min(1, texScaleCenter.u + texMoveStep);
                break;

            case 'KeyQ':
                texScale = Math.max(0.1, texScale - 0.1);
                break;

            case 'KeyE':
                texScale = Math.min(5.0, texScale + 0.1);
                break;

            default:
                return;
        }

        updateScaleDisplay();
        event.preventDefault();
    });
}


function updateScaleDisplay() {
    document.getElementById('centerU').textContent = texScaleCenter.u.toFixed(2);
    document.getElementById('centerV').textContent = texScaleCenter.v.toFixed(2);
    document.getElementById('scaleValue').textContent = texScale.toFixed(2);
    
    // Оновити позиції слайдерів
    document.getElementById('centerUSlider').value = texScaleCenter.u;
    document.getElementById('centerVSlider').value = texScaleCenter.v;
    document.getElementById('scaleSlider').value = texScale;
}

function LoadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255])
    );

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;

    return texture;
}

