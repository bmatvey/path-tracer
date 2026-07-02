import vertexShaderSource from './shaders/vertex.glsl';
import fragmentShaderSource from './shaders/fragment.glsl';
import { createProgram, createShader } from '../src/shader_helpers';
import { mat3, vec3 } from 'gl-matrix';
import { Camera, Sphere, Triangle, GlobalLight, Material } from '../src/3D';

const DEFAULT_MAX_BOUNCES = 5;
const CAMERA_DISTANCE = 15;
const CAMERA_FOCAL_DISTANCE = 3;

class Renderer {

    private readonly spheres: Sphere[] = [new Sphere(vec3.fromValues(0, 0, 0), 0, new Material(0, 0, 0, 0, 0, 0, vec3.create()))];
    private readonly triangles: Triangle[] = [new Triangle(vec3.create(), vec3.create(), vec3.create(), new Material(0, 0, 0, 0, 0, 0, vec3.create()))];
    private readonly globalLight: GlobalLight;
    private camera: Camera;
    private readonly uniforms: Map<string, WebGLUniformLocation> = new Map();
    private program: WebGLProgram;
    private maxBounces: number = DEFAULT_MAX_BOUNCES;
    private fragShaderSource: string = fragmentShaderSource;
    private sampleNumber: number = 0;
    private pingPongBuffers: PingPongBuffers;
    private objectBuffer: WebGLBuffer; 
    private cameraOffset: [number, number] = [0, 0];


    public constructor (
        private readonly canvas: HTMLCanvasElement, 
        private readonly gl: WebGL2RenderingContext
    ){
        window.addEventListener('resize', this.resize);
        let ticking = false;
        let moving = true;
        window.addEventListener('mousemove', (event) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (moving) {
                        const cameraX = event.offsetX - this.cameraOffset[0];
                        const cameraY = event.offsetY - this.cameraOffset[1];
                        this.moveCamera(-1.5 * cameraX / this.canvas.width, 1-cameraY / this.canvas.height);
                    }
                    ticking = false;
                });
            }
            ticking = true;
        });

        window.addEventListener('mousedown', (event) => {
            // if (moving) {
            //     this.cameraOffset = [event.offsetX, event.offsetY];
            // } else {
            // }
            
            this.cameraOffset = [event.offsetX - this.cameraOffset[0], event.offsetY - this.cameraOffset[1]]; // this is voodoo magic but it works trust

            moving = !moving;
            console.log(this.cameraOffset);
        });

        this.objectBuffer = this.gl.createBuffer();
        this.program = this.compileShaders();
        this.gl.useProgram(this.program);
        this.pingPongBuffers = new PingPongBuffers(gl, canvas.width, canvas.height);
        this.resize();
        this.bindVertexBuffer();

        // place camera
        this.camera = this.moveCamera(0, 0);
        console.log(this.camera.toString());

        this.globalLight = new GlobalLight(
            vec3.fromValues(0, -1, -0.5),
            1,
            0.7,
            vec3.fromValues(1, 1, 1),
            vec3.fromValues(0.3, 0.3, 0.3)
        );

        this.renderLoop();
    }

    private render() {
        this.sampleNumber++;

        let {readTexture, writeBuffer} = this.pingPongBuffers.getBufferTexture();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, writeBuffer);
        // prepare for rendering

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, readTexture);

        this.setRenderingUniforms();

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // blit image to screen
        this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, writeBuffer);
        this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null);

        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.blitFramebuffer(
            0, 0, this.canvas.width, this.canvas.height,
            0, 0, this.canvas.width, this.canvas.height,
            this.gl.COLOR_BUFFER_BIT,
            this.gl.NEAREST
        );
    }

    private moveCamera(x: number, y: number) {
        let theta = x * 2 * Math.PI % (2 * Math.PI);
        let phi = y * Math.PI % (2 * Math.PI);

        let location = vec3.fromValues(
            CAMERA_DISTANCE * Math.sin(phi) * Math.cos(theta),
            CAMERA_DISTANCE * Math.sin(phi) * Math.sin(theta),
            CAMERA_DISTANCE * Math.cos(phi)
        );

        let direction = vec3.create();
        vec3.scale(direction, location, -CAMERA_FOCAL_DISTANCE/CAMERA_DISTANCE);

        let right = vec3.create();
        vec3.cross(right, direction, vec3.fromValues(0, 1e-10, 1));
        vec3.normalize(right, right);

        this.camera = new Camera(
            location,
            direction,
            right
        );

        this.sampleNumber = 0;

        return this.camera;
    }

    public renderLoop = () => {
        if (this.sampleNumber < 500) {
            this.render();
        } else if (this.sampleNumber === 500) {
            this.sampleNumber++;
            console.log('render done')
        }

        requestAnimationFrame(this.renderLoop);
    }

    /**
     * resize canvas to window
     */
    private resize = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.pingPongBuffers = this.pingPongBuffers.resize(this.canvas.width, this.canvas.height);
        this.sampleNumber = 0;
        const resolutionLocation = this.uniforms.get('u_resolution') as WebGLUniformLocation;
        this.gl.uniform2f(resolutionLocation, this.gl.canvas.width, this.gl.canvas.height);
    }

    /**
     * Compiles shader program with current triangle, sphere, bounce, and lighting data. Records locations
     * of necessary uniforms.
     * @returns Compiled program
     */
    private compileShaders() {
        // update constants in shader source
        this.fragShaderSource = this.fragShaderSource.replace(/const int MAX_BOUNCES = \d+;/, `const int MAX_BOUNCES = ${this.maxBounces};`);
        this.fragShaderSource = this.fragShaderSource.replace(/const int NUM_SPHERES = \d+;/, `const int NUM_SPHERES = ${this.spheres.length};`);
        this.fragShaderSource = this.fragShaderSource.replace(/const int NUM_TRIANGLES = \d+;/, `const int NUM_TRIANGLES = ${this.triangles.length};`);

        // compile and set up shaders
        
        const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragShaderSource);
        
        this.program = createProgram(this.gl, vertexShader, fragmentShader);
        
        // find uniform locations
        const uniformNames: Array<string> = ['u_resolution', 'u_sample', 'u_time', 'u_previousFrame'];
        for (const uName of uniformNames) {
            const uniformLocation = this.gl.getUniformLocation(this.program, uName);
            if (uniformLocation === null) {throw new Error(`Cannot find uniform ${uName}`);}
            this.uniforms.set(uName, uniformLocation);
        }

        // bind object buffer
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.objectBuffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, this.generateObjectData(), this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

        const blockIndex = this.gl.getUniformBlockIndex(this.program, "objectBuffer");
        const bindingPoint = 1  ; // Pick an arbitrary binding point slot (1-15+)

        this.gl.uniformBlockBinding(this.program, blockIndex, bindingPoint);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, bindingPoint, this.objectBuffer);

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
        const previousFrameUniformLocation = this.uniforms.get('u_previousFrame') as WebGLUniformLocation;

        this.gl.uniform2f(resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.uniform1i(sampleUniformLocation, this.sampleNumber);
        this.gl.uniform1i(timeUniformLocation, performance.now());
        this.gl.uniform1i(previousFrameUniformLocation, 0);
        this.camera.setUniforms(this.gl, this.program);
        this.globalLight.setUniforms(this.gl, this.program);

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.objectBuffer);
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, this.generateObjectData());
    }

    // TODO: make this function work properly
    private generateObjectData(): Float32Array {
        return new Float32Array([
            0, 0, 0,
            1,
            1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0,

            5, 5, -1, 0,
            -5, -5, -1, 0,
            5, -5, -1, 0,
            1.5, 0, 0, 1, 0, 0, 0, 0, 0.28, 0.78, 0.21, 0,
        ]);
    }
}

class PingPongBuffers {
    private buffers: [WebGLFramebuffer, WebGLFramebuffer];
    private textures: [WebGLTexture, WebGLTexture];
    private currentReadIndex = 1;

    public constructor(
        private readonly gl: WebGL2RenderingContext,
        private width: number,
        private height: number
    ) {
        this.buffers = [gl.createFramebuffer(), gl.createFramebuffer()];
        this.textures = [gl.createTexture(), gl.createTexture()];

        for (let i = 0; i < 2; i++) {
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
            
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
            
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers[i]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);
          }

          gl.bindTexture(gl.TEXTURE_2D, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    public getBufferTexture() {
        this.swapBuffers();
        return {
            writeBuffer: this.buffers[(this.currentReadIndex + 1) % 2],
            readTexture: this.textures[this.currentReadIndex]
        }
    }

    /**
     * 
     * @param newWidth New width
     * @param newHeight New height
     * @returns A new pair of buffers and textures to use for the resized canvas
     */
    public resize(newWidth: number, newHeight: number): PingPongBuffers {
        if (this.width === newWidth && this.height === newHeight) {return this};

        for (let i = 0; i < 2; i++) {
            this.gl.deleteTexture(this.textures[i]);
            this.gl.deleteFramebuffer(this.buffers[i]);
        }

        return new PingPongBuffers(this.gl, newWidth, newHeight);
    }

    private swapBuffers() {
        this.currentReadIndex = (this.currentReadIndex + 1) % 2;
    }
}

// get canvas
const canvas = document.getElementById("webgl-canvas") as HTMLCanvasElement;
const gl = canvas.getContext('webgl2', { antialias: false });

if (gl === null) {
    throw new Error('Webgl not supported');
}
// Ensure the float extension is enabled
if (!gl.getExtension('EXT_color_buffer_float')) {
  throw new Error('Floating point render targets not supported');
}

const renderer = new Renderer(canvas, gl);