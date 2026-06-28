import vertexShaderSource from './shaders/vertex.glsl';
import fragmentShaderSource from './shaders/fragment.glsl';
import { createProgram, createShader } from '../src/shader_helpers';
import { mat3, vec3 } from 'gl-matrix';
import { Camera, Sphere, Triangle, GlobalLight } from '../src/3D';

const DEFAULT_MAX_BOUNCES = 5;

class Renderer {

    private readonly spheres: Sphere[] = [];
    private readonly triangles: Triangle[] = [];
    private readonly globalLight: GlobalLight;
    private camera: Camera;
    private readonly uniforms: Map<string, WebGLUniformLocation> = new Map();
    private program: WebGLProgram;
    private maxBounces: number = DEFAULT_MAX_BOUNCES;
    private fragShaderSource: string = fragmentShaderSource;
    


    public constructor (
        private readonly canvas: HTMLCanvasElement, 
        private readonly gl: WebGL2RenderingContext
    ){
        window.addEventListener('resize', this.resize);
        this.program = this.compileShaders();
        this.bindVertexBuffer();

        // place camera
        let cam_location = vec3.fromValues(10, 1, 1);
        let cam_forwardDirection = vec3.fromValues(-3, 0, -0.4);
        let cam_rightDirection = vec3.fromValues(0, 1, 0);
        this.camera = new Camera(cam_location, cam_forwardDirection, cam_rightDirection);

        this.globalLight = new GlobalLight(
            vec3.fromValues(0, -1, -0.5),
            1,
            0.7,
            vec3.fromValues(1, 1, 1),
            vec3.fromValues(0.3, 0.3, 0.3)
        );

        this.render();
    }

    private render() {
        // prepare for rendering
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.program);

        this.setRenderingUniforms();
        this.resize();

        this.bindVertexBuffer();

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
     * resize canvas to window
     */
    private resize(): void{
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, canvas.width, canvas.height);
        const resolutionLocation = this.uniforms.get('u_resolution') as WebGLUniformLocation;
        this.gl.uniform2f(resolutionLocation, this.gl.canvas.width, this.gl.canvas.height);
        this.bindVertexBuffer();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
     * Compiles shader program with current triangle, sphere, bounce, and lighting data. Records locations
     * of necessary uniforms.
     * @returns Compiled program
     */
    private compileShaders() {
        // update constants in shader source
        this.fragShaderSource = this.fragShaderSource.replace(/const int MAX_BOUNCES = \d+;/, `const int MAX_BOUNCES = ${this.maxBounces};`);
        // this.fragShaderSource = this.fragShaderSource.replace(/const int NUM_SPHERES = \d+;/, `const int NUM_SPHERES = ${this.spheres.length};`);
        // this.fragShaderSource = this.fragShaderSource.replace(/const int NUM_TRIANGLES = \d+;/, `const int NUM_TRIANGLES = ${this.triangles.length};`);

        // compile and set up shaders
        
        const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragShaderSource);
        
        this.program = createProgram(this.gl, vertexShader, fragmentShader);
        
        // find uniform locations
        const uniformNames: Array<string> = ['u_resolution', 'u_sample', 'u_time'];
        for (const uName of uniformNames) {
            const uniformLocation = this.gl.getUniformLocation(this.program, uName);
            if (uniformLocation === null) {throw new Error(`Cannot find uniform ${uName}`);}
            this.uniforms.set(uName, uniformLocation);
        }

        return this.program;
    }

    /**
     * Save basic 2 triangle setup into the drawing vertex buffer
     */
    private bindVertexBuffer() {
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

        const positions: Array<number> = [
            -1, -1,     1, -1,      -1, 1,
            1, -1,      -1, 1,      1, 1,
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    }

    private setRenderingUniforms() {
        const aPosition = this.gl.getAttribLocation(this.program, "a_position");
        this.gl.enableVertexAttribArray(aPosition);
        this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);
        
        // bind uniforms
        const resolutionUniformLocation = this.uniforms.get('u_resolution') as WebGLUniformLocation;
        const sampleUniformLocation = this.uniforms.get('u_sample') as WebGLUniformLocation;
        const timeUniformLocation = this.uniforms.get('u_time') as WebGLUniformLocation;

        this.gl.uniform2f(resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.uniform1i(sampleUniformLocation, 1);
        this.gl.uniform1i(timeUniformLocation, performance.now());
        this.camera.setUniforms(this.gl, this.program);
        this.globalLight.setUniforms(this.gl, this.program);

    }
}

// get canvas
const canvas = document.getElementById("webgl-canvas") as HTMLCanvasElement;
const gl = canvas.getContext('webgl2');

if (gl === null) {
    throw new Error('Webgl not supported');
}

const renderer = new Renderer(canvas, gl);