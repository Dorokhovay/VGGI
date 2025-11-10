class Mesh3D {

    constructor(label) {
        this.label = label || 'Mesh';
        this.vertexBuffer = gl.createBuffer();

        this.linesU = { start: 0, perLine: 0, total: 0 };
        this.linesV = { start: 0, perLine: 0, total: 0 };
        this.vertexCount = 0;
    }

    uploadData(vertices, uGrid, vGrid) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.vertexCount = vertices.length / 3;

        this.linesU = {
            start: uGrid.offset,
            perLine: uGrid.verticesPerLine,
            total: uGrid.numLines
        };

        this.linesV = {
            start: vGrid.offset,
            perLine: vGrid.verticesPerLine,
            total: vGrid.numLines
        };
    }

    render() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        gl.vertexAttribPointer(shaderObj.vertexAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderObj.vertexAttrib);

        let idx = this.linesU.start;
        const vertsU = this.linesU.perLine;
        for (let i = 0; i < this.linesU.total; i++) {
            if (vertsU > 0) gl.drawArrays(gl.LINE_STRIP, idx, vertsU);
            idx += vertsU;
        }

        idx = this.linesV.start;
        const vertsV = this.linesV.perLine;
        for (let i = 0; i < this.linesV.total; i++) {
            if (vertsV > 0) gl.drawArrays(gl.LINE_STRIP, idx, vertsV);
            idx += vertsV;
        }
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
