class Model {
    constructor(name){
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.iWireIndexBuffer = gl.createBuffer();

    this.iTexCoordBuffer = gl.createBuffer();
    this.iTangentBuffer = gl.createBuffer();
    this.iBitangentBuffer = gl.createBuffer();

    this.indexCount = 0;
    this.primitive = gl.TRIANGLES;
    }

    BufferData(vertices, indices, wireIndices, normals, texcoords, tangents, bitangents) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        if (texcoords && texcoords.length > 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
        }

        if (tangents && tangents.length > 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
        }

        if (bitangents && bitangents.length > 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iBitangentBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bitangents), gl.STATIC_DRAW);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);
        this.fillIndexCount = indices.length;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iWireIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireIndices), gl.STREAM_DRAW);
        this.wireIndexCount = wireIndices.length;
    }

    Draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        if (shProgram.iAttribVertex !== -1) {
            gl.enableVertexAttribArray(shProgram.iAttribVertex);
            gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        if (shProgram.iAttribNormal !== -1) {
            gl.enableVertexAttribArray(shProgram.iAttribNormal);
            gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        }

        if (this.iTexCoordBuffer && shProgram.iAttribTexCoord !== undefined && shProgram.iAttribTexCoord !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
            gl.enableVertexAttribArray(shProgram.iAttribTexCoord);
            gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        }

        if (this.iTangentBuffer && shProgram.iAttribTangent !== undefined && shProgram.iAttribTangent !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
            gl.enableVertexAttribArray(shProgram.iAttribTangent);
            gl.vertexAttribPointer(shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        }

        if (this.iBitangentBuffer && shProgram.iAttribBitangent !== undefined && shProgram.iAttribBitangent !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iBitangentBuffer);
            gl.enableVertexAttribArray(shProgram.iAttribBitangent);
            gl.vertexAttribPointer(shProgram.iAttribBitangent, 3, gl.FLOAT, false, 0, 0);
        }

        if (renderMode === "fill") {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
            gl.drawElements(gl.TRIANGLES, this.fillIndexCount, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iWireIndexBuffer);
            gl.drawElements(gl.LINES, this.wireIndexCount, gl.UNSIGNED_SHORT, 0);
        }

        if (shProgram.iAttribVertex !== -1) gl.disableVertexAttribArray(shProgram.iAttribVertex);
        if (shProgram.iAttribNormal !== -1) gl.disableVertexAttribArray(shProgram.iAttribNormal);
        if (shProgram.iAttribTexCoord !== -1) gl.disableVertexAttribArray(shProgram.iAttribTexCoord);
        if (shProgram.iAttribTangent !== -1) gl.disableVertexAttribArray(shProgram.iAttribTangent);
        if (shProgram.iAttribBitangent !== -1) gl.disableVertexAttribArray(shProgram.iAttribBitangent);
    }
}



class ShaderProgram {
    constructor(name, program){
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
    }
    activate() { gl.useProgram(this.prog); }
}


window.Model = Model;
window.ShaderProgram = ShaderProgram;