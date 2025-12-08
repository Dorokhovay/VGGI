class Mesh3D {

    constructor(label) {
        this.label = label || 'Mesh';

        this.vertexBuffer = gl.createBuffer();

        this.indexBufferU = gl.createBuffer();
        this.indexBufferV = gl.createBuffer();

        this.indexCountU = 0;
        this.indexCountV = 0;
    }

    uploadData(vertices, uGrid, vGrid) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferU);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(uGrid.indices), gl.STATIC_DRAW);
        this.indexCountU = uGrid.indices.length;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferV);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(vGrid.indices), gl.STATIC_DRAW);
        this.indexCountV = vGrid.indices.length;
    }

    render() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(shaderObj.vertexAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderObj.vertexAttrib);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferU);
        gl.drawElements(gl.LINES, this.indexCountU, gl.UNSIGNED_INT, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferV);
        gl.drawElements(gl.LINES, this.indexCountV, gl.UNSIGNED_INT, 0);
    }
}


class GLSLProgram {

    constructor(label, program) {
        this.label = label || 'Default';
        this.program = program;

        this.vertexAttrib = -1;
        this.colorUniform = -1;
        this.mvpMatrixUniform = -1;
    }

    activate() {
        gl.useProgram(this.program);
    }
}

window.Mesh3D = Mesh3D;
window.GLSLProgram = GLSLProgram;
