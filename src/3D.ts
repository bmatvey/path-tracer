import { mat3, vec3 } from 'gl-matrix';

export class Camera {

    private readonly directionMatrix: mat3;

    /**
     * 
     * @param location Location of camera origin
     * @param camera_direction Direction in which camera is pointing
     * @param right_direction Defining right direction for camera. Gets projected into camera_direction
     * @param program WebGL program into which the camera binds
     */
    public constructor(
        private readonly location: vec3,
        camera_direction: vec3,
        right_direction: vec3,
    ) {
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

    }

    public toString() {
        return String(this.directionMatrix) + String(this.location);
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
    public setUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): void {
        const u_camPositionLocation = gl.getUniformLocation(program, 'u_camPosition') as WebGLUniformLocation;
        const u_camOrientationLocation = gl.getUniformLocation(program, 'u_camOrientation') as WebGLUniformLocation;

        gl.uniform3fv(u_camPositionLocation, this.location);
        gl.uniformMatrix3fv(
            u_camOrientationLocation,
            false,
            this.directionMatrix
        );
    }
}

export class Material {
    public constructor (
        private ior: number,
        private translucence: number,
        private reflectance: number,
        private diffuse: number,
        private absorption: number,
        private emission: number,
        private color: vec3
    ) {this.checkRep();}

    private checkRep() {
        if (this.translucence + this.reflectance + this.diffuse + this.absorption !== 1) {
            throw new Error("Invalid material");
        }
    }

    public static size(): number {
        return 4*3;
    }

    public writeMaterialData(array: Float32Array, startIndex: number) {
        array[startIndex] = this.ior;
        array[startIndex + 1] = this.translucence;
        array[startIndex + 2] = this.reflectance;
        array[startIndex + 3] = this.diffuse;
        array[startIndex + 4] = this.absorption;
        array[startIndex + 5] = this.emission
        array[startIndex + 6] = 0;
        array[startIndex + 7] = 0;
        array[startIndex + 8] = this.color[0];
        array[startIndex + 9] = this.color[1];
        array[startIndex + 10] = this.color[2];
        array[startIndex + 11] = 0;
    }
}

// should be immutable (can't move)
export class Sphere {
    public constructor (
        private position: vec3,
        private radius: number,
        private material: Material
    ) {}

    public static get size(): number {
        return 4 + Material.size();
    }

    public writeObjectData(array: Float32Array, startIndex: number) {
        array[startIndex] = this.position[0];
        array[startIndex + 1] = this.position[1];
        array[startIndex + 2] = this.position[2];
        array[startIndex + 3] = this.radius;
        this.material.writeMaterialData(array, startIndex + 4);
    }
}

// should be immutable (can't move)
export class Triangle {
    public constructor (
        private vert1: vec3,
        private vert2: vec3,
        private vert3: vec3,
        private material: Material
    ) {}

    public static get size(): number {
        return 3*4 + Material.size();
    }

    public writeObjectData(array: Float32Array, startIndex: number) {
        this.writeVertexData(array, startIndex, this.vert1);
        this.writeVertexData(array, startIndex + 4, this.vert2);
        this.writeVertexData(array, startIndex + 8, this.vert3);
        this.material.writeMaterialData(array, startIndex + 12);
    }

    private writeVertexData(array: Float32Array, startIndex: number, vertex: vec3) {
        for (let i = 0; i < 3; i++) {
            array[startIndex + i] = vertex[i];
        }
        array[startIndex + 3] = 0;
    }

}

export class GlobalLight {
    
    private readonly u_GLOBAL_LIGHT_name: string = 'GLOBAL_LIGHT';

    public constructor(
        private direction: vec3,
        private intensity: number,
        private sunCosineThreshold: number,
        private sunColor: vec3,
        private globalIllumination: vec3,
    ) {}

    public setUniforms(gl: WebGL2RenderingContext, program: WebGLProgram) {
        gl.uniform3fv(gl.getUniformLocation(program, `${this.u_GLOBAL_LIGHT_name}.sun`), this.direction);
        gl.uniform1f(gl.getUniformLocation(program, `${this.u_GLOBAL_LIGHT_name}.sunIntensity`), this.intensity);
        gl.uniform1f(gl.getUniformLocation(program, `${this.u_GLOBAL_LIGHT_name}.sunCosineThreshold`), this.sunCosineThreshold);
        gl.uniform3fv(gl.getUniformLocation(program, `${this.u_GLOBAL_LIGHT_name}.sunColor`), this.sunColor);
        gl.uniform3fv(gl.getUniformLocation(program, `${this.u_GLOBAL_LIGHT_name}.globalIllumination`), this.globalIllumination);
    }
}