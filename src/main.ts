import vertexShaderSource from './shaders/vertex.glsl';
import fragmentShaderSource from './shaders/fragment.glsl';
import { createProgram, createShader } from '../src/shader_helpers';
import { matrix, matrixFromColumns, cross, Matrix } from 'mathjs';
import { mat3, vec3 } from 'gl-matrix';

class Camera {

    private readonly location: vec3;
    private readonly directionMatrix: mat3;
    private readonly u_camPositionLocation: WebGLUniformLocation;
    private readonly u_camOrientationLocation: WebGLUniformLocation;


    /**
     * 
     * @param location Location of camera origin
     * @param camera_direction Direction in which camera is pointing
     * @param right_direction Defining right direction for camera. Gets projected into camera_direction
     * @param program WebGL program into which the camera binds
     */
    public constructor(location: vec3, camera_direction: vec3, right_direction: vec3, program: WebGLProgram) {
        const i_direction = this.projectVecOntoPlane(camera_direction, right_direction);

        const k_direction = vec3.create();
        vec3.scale(k_direction, camera_direction, -1);
        const j_direction = vec3.create();
        vec3.cross(j_direction, k_direction, i_direction);

        vec3.normalize(i_direction, i_direction);
        vec3.normalize(j_direction, j_direction);

        this.directionMatrix = mat3.fromValues(
            i_direction[0], i_direction[1], i_direction[2],
            j_direction[0], j_direction[1], j_direction[2],
            k_direction[0], k_direction[1], k_direction[2],
        );

        this.location = location;
        this.u_camPositionLocation = gl?.getUniformLocation(program, 'u_camPosition') as WebGLUniformLocation;
        this.u_camOrientationLocation = gl?.getUniformLocation(program, 'u_camOrientation') as WebGLUniformLocation;
    }

    /**
     * @param planeNormal Normal vector of plane onto which to project
     * @param vec Vector to project
     * @returns projected vector
     */
    private projectVecOntoPlane(planeNormal: vec3, vec: vec3): vec3 {
        const projectionAlongNormal = vec3.scale(vec3.create(), planeNormal, vec3.dot(planeNormal, vec));

        return vec3.subtract(vec3.create(), vec, projectionAlongNormal);

    }

    /**
     * Bind camera uniforms to the given WebGL program
     */
    public bindUniforms(): void {
        gl?.uniform3fv(this.u_camPositionLocation, this.location);
        gl?.uniformMatrix3fv(
            this.u_camOrientationLocation,
            false,
            this.directionMatrix
        );
    }
}

// get canvas
const canvas = document.getElementById("webgl-canvas") as HTMLCanvasElement;
const gl = canvas.getContext('webgl2');

if (gl === null) {
    throw new Error('Webgl not supported');
}

// resize canvas to window 

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    gl!.uniform2f(resolutionUniformLocation, gl!.canvas.width, gl!.canvas.height);

}

window.addEventListener('resize', resize);

// compile and set up shaders

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = createProgram(gl, vertexShader, fragmentShader);

// find uniform locations
const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
const maxBouncesUniformLocation = gl.getUniformLocation(program, 'u_maxBounces');
const sampleUniformLocation = gl.getUniformLocation(program, 'u_sample');
const timeUniformLocation = gl.getUniformLocation(program, 'u_time');


const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

const positions: Array<number> = [
    -1, -1,     1, -1,      -1, 1,
    1, -1,      -1, 1,      1, 1,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.useProgram(program);

const aPosition = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

// bind uniforms
gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
let cam_location = vec3.fromValues(10, 1, 1);
let cam_forwardDirection = vec3.fromValues(-3, 0, -0.4);
let cam_rightDirection = vec3.fromValues(0, 1, 0);
const camera = new Camera(cam_location, cam_forwardDirection, cam_rightDirection, program);
camera.bindUniforms();
gl.uniform1i(maxBouncesUniformLocation, 5);
gl.uniform1i(sampleUniformLocation, 1);
gl.uniform1i(timeUniformLocation, performance.now());

resize();

gl.drawArrays(gl.TRIANGLES, 0, 6);
