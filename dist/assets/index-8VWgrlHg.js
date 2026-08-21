var e=(e,t)=>()=>(e&&(t=e(e=0)),t),t=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports);(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var n,r=e((()=>{n=`#version 300 es
in vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`})),i,a=e((()=>{i=`#version 300 es
precision highp float;

#define TWO_PI 6.28318530718
#define PI 3.14159265359

uniform vec2 u_resolution;

const int MAX_BOUNCES = 5;
uniform int u_sample;
uniform int u_time;

uniform vec3 u_camPosition;
uniform mat3 u_camOrientation;

uniform sampler2D u_previousFrame; 

out vec4 outColor;

uvec3 rng_state;

void init_rng() {
    uvec3 v = uvec3(uint(gl_FragCoord.x), uint(gl_FragCoord.y), uint(u_time + u_sample));
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    
    rng_state = v;
}

float next_rand() {
    rng_state = rng_state * 1664525u + 1013904223u;
    
    uint hash = rng_state.x ^ rng_state.y ^ rng_state.z;

    hash &= 0x007FFFFFu; 
    hash |= 0x3F800000u; 
    return uintBitsToFloat(hash) - 1.0; 
}

struct Ray {
    vec3 position;
    vec3 direction;
    float ior;
};

struct Material {
    float ior;
    float translucence;
    float reflectance;
    float diffuse;
    float absorption;
    float emission;
    vec2 padding1;
    vec3 color;
    float padding2;
};

const Material DEFAULT_MATERIAL = Material(
    0.,
    0.,
    0.,
    0.,
    0.,
    0.,
    vec2(0.),
    vec3(1.),
    0.
);

struct Sphere {
    vec3 position;
    float radius;
    Material material;
};

struct Triangle {
    vec3 vert1;
    vec3 vert2;
    vec3 vert3;
    Material material;
};

struct Intersection {
    float t;
    vec3 normal;
    Material material;
};

const int NUM_SPHERES = 3;

const int NUM_TRIANGLES = 2;

layout(std140) uniform objectBuffer {
    Sphere spheres[NUM_SPHERES];
    Triangle triangles[NUM_TRIANGLES];
};

struct GlobalLighting {
    vec3 sun; 
    float sunIntensity; 
    float sunCosineThreshold; 
    vec3 sunColor; 
    vec3 globalIllumination; 
};

uniform GlobalLighting GLOBAL_LIGHT;

Intersection intersectSphere(Intersection prevIntersect, Ray ray, Sphere sphere) {
    Intersection newIntersection = prevIntersect;
    vec3 V = ray.position - sphere.position;
    vec3 R = ray.direction;
    float r = sphere.radius;

    float b = 2. * dot(V, R);
    float disc = b * b - 4. * (dot(V, V) - r*r);

    float t = (-b - sqrt(abs(disc))) / 2.;

    vec3 intersectLocation = ray.position + ray.direction * t;

    if (disc >= 0. && t < prevIntersect.t && t > 0.) {
        newIntersection = Intersection(
            t,
            normalize(intersectLocation - sphere.position),
            sphere.material
        );
    }

    return newIntersection;
}

Intersection intersectTriangle(Intersection prevIntersect, Ray ray, Triangle triangle) {
    Intersection newIntersection = prevIntersect;
    vec3 e1 = triangle.vert2 - triangle.vert1;
    vec3 e2 = triangle.vert3 - triangle.vert1;
    vec3 P = cross(ray.direction, e2);
    float det = dot(e1, P);
    if (abs(det) > 1.e-5) {
        vec3 T = ray.position - triangle.vert1;
        float u = dot(T, P) / det;
        vec3 Q = cross(T, e1);
        float v = dot(ray.direction, Q) / det;
        float t = dot(e2, Q) / det;

        if (u > 0. && u < 1. && v > 0. && u + v < 1. && t > 0. && t < prevIntersect.t) {
            vec3 normal = normalize(cross(e1, e2));
            normal = dot(normal, ray.direction) > 0.? -normal: normal;
            newIntersection = Intersection(
                t,
                normal,
                triangle.material
            );
        }
    }
    return newIntersection;
}

float colatitude_approx(Ray ray, vec3 normal, float prevIOR, float newIOR) {
    float R = (prevIOR - newIOR) / (prevIOR + newIOR);
    R = R * R;
    
    float cosTheta = -dot(ray.direction, normal);
    if (prevIOR > newIOR) {
        vec3 refracted = refract(ray.direction, normal, prevIOR/newIOR);
        if (refracted == vec3(0.)) return 1.0;
        cosTheta = dot(normal, refracted);
    }

    float x = 1.0 - cosTheta;
    return R + (1.0 - R) * x * x * x * x * x;
}

vec3 updateThroughput(vec3 currentThroughput, Intersection intersection, inout Ray currentRay) {
    float intersectTypeSelector = next_rand();

    if (intersectTypeSelector < intersection.material.translucence) {
        
        
        
        
        
        
        
        

        float fresnel = colatitude_approx(currentRay, intersection.normal, currentRay.ior, intersection.material.ior);
        float fresnelSelector = next_rand();
        if (fresnelSelector < fresnel) {
            currentRay = Ray(
                currentRay.position + intersection.t * currentRay.direction + 0.0001 * intersection.normal,
                reflect(currentRay.direction, intersection.normal),
                currentRay.ior
            );
        } else {
            float newIOR = intersection.material.ior == currentRay.ior? 1.0: intersection.material.ior;
            vec3 newDir = refract(currentRay.direction, intersection.normal, currentRay.ior / newIOR);
            currentRay = Ray(
                currentRay.position + intersection.t * currentRay.direction - 0.0001 * intersection.normal,
                newDir,
                newIOR
            );
        }

    } else if (intersectTypeSelector < intersection.material.translucence + intersection.material.reflectance) {
        
        currentRay = Ray(
            currentRay.position + intersection.t * currentRay.direction + 0.0001 * intersection.normal,
            reflect(currentRay.direction, intersection.normal),
            currentRay.ior
        );
    } else if (intersectTypeSelector < intersection.material.translucence + intersection.material.reflectance + intersection.material.diffuse){
        
        float theta = next_rand() * TWO_PI;
        float phi = next_rand() * PI;
        vec3 uniformVector = vec3(
            sin(theta) * cos(phi),
            sin(theta) * sin(phi),
            cos(theta)
        );
        vec3 newDirection = intersection.normal + uniformVector;
        currentRay = Ray(
            currentRay.position + intersection.t * currentRay.direction + 0.0001 * intersection.normal,
            normalize(newDirection),
            currentRay.ior
        );
    } else {
        currentThroughput = vec3(0);
    };

    return currentThroughput * intersection.material.color;
}

vec3 tracePath(Ray ray) {
    Ray currentRay = ray;
    vec3 pathThroughput = vec3(1.);
    vec3 accumulatedLight = vec3(0.);

    for (int b = 0; b < MAX_BOUNCES; b++) {
        
        Intersection closestIntersection = Intersection(
            1.e20,
            ray.direction,
            DEFAULT_MATERIAL
        );
        for (int s = 0; s < NUM_SPHERES; s++) {
            closestIntersection = intersectSphere(closestIntersection, currentRay, spheres[s]);
        }
        for (int tri = 0; tri < NUM_TRIANGLES; tri++) {
            closestIntersection = intersectTriangle(closestIntersection, currentRay, triangles[tri]);
        }
        if (closestIntersection.t > 1.e19) {
            
            float sunIntensity = GLOBAL_LIGHT.sunIntensity * step(GLOBAL_LIGHT.sunCosineThreshold, 
                dot(currentRay.direction, -GLOBAL_LIGHT.sun)
            );
            accumulatedLight += pathThroughput * GLOBAL_LIGHT.sunColor * sunIntensity + pathThroughput * GLOBAL_LIGHT.globalIllumination;
            break;
        } else {
            
            accumulatedLight += closestIntersection.material.emission * closestIntersection.material.color * pathThroughput;
            pathThroughput = updateThroughput(pathThroughput, closestIntersection, currentRay);
        }
    }

    return vec3(accumulatedLight);
}

vec2 normalizeCoords() {
    return (gl_FragCoord.xy / u_resolution) * 2. + vec2(-1., -1.);
}

void main() {
    init_rng();
    vec2 uv = normalizeCoords();
    vec3 coords = vec3(uv.x * u_resolution.x / u_resolution.y, uv.y, -1.); 
    vec3 rayDirection = normalize(u_camOrientation * coords);
    Ray fromCamera = Ray(u_camPosition, rayDirection, 1.0);

    const int num_rays = 20;
    vec3 runningSum = vec3(0.);
    for (int i = 0; i < num_rays; i++) {
        runningSum = runningSum + tracePath(fromCamera);
    }

    outColor = mix(
        texture(u_previousFrame, gl_FragCoord.xy/u_resolution),
        vec4(runningSum / float(num_rays), 1.0),
        1.0 / float(u_sample)
    );

}`}));function o(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS))return r;throw console.log(e.getShaderInfoLog(r)),e.deleteShader(r),Error(`Couldn't compile shader`)}function s(e,t,n){let r=e.createProgram();if(e.attachShader(r,t),e.attachShader(r,n),e.linkProgram(r),e.getProgramParameter(r,e.LINK_STATUS))return r;throw console.log(e.getProgramInfoLog(r)),e.deleteProgram(r),Error(`Couldn't link program`)}var c=e((()=>{})),l,u=e((()=>{l=typeof Float32Array<`u`?Float32Array:Array,Math.PI/180,180/Math.PI}));function d(e,t,n,r,i,a,o,s,c){var u=new l(9);return u[0]=e,u[1]=t,u[2]=n,u[3]=r,u[4]=i,u[5]=a,u[6]=o,u[7]=s,u[8]=c,u}var f=e((()=>{u()}));function p(){var e=new l(3);return l!=Float32Array&&(e[0]=0,e[1]=0,e[2]=0),e}function m(e,t,n){var r=new l(3);return r[0]=e,r[1]=t,r[2]=n,r}function h(e,t,n){return e[0]=t[0]-n[0],e[1]=t[1]-n[1],e[2]=t[2]-n[2],e}function g(e,t,n){return e[0]=t[0]*n,e[1]=t[1]*n,e[2]=t[2]*n,e}function _(e,t){var n=t[0],r=t[1],i=t[2],a=n*n+r*r+i*i;return a>0&&(a=1/Math.sqrt(a)),e[0]=t[0]*a,e[1]=t[1]*a,e[2]=t[2]*a,e}function v(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function y(e,t,n){var r=t[0],i=t[1],a=t[2],o=n[0],s=n[1],c=n[2];return e[0]=i*c-a*s,e[1]=a*o-r*c,e[2]=r*s-i*o,e}var b=e((()=>{u(),function(){var e=p();return function(t,n,r,i,a,o){var s,c;for(n||=3,r||=0,c=i?Math.min(i*n+r,t.length):t.length,s=r;s<c;s+=n)e[0]=t[s],e[1]=t[s+1],e[2]=t[s+2],a(e,e,o),t[s]=e[0],t[s+1]=e[1],t[s+2]=e[2];return t}}()})),x=e((()=>{f(),b()})),S,C,w,T,E,D=e((()=>{x(),S=class{location;directionMatrix;constructor(e,t,n){this.location=e;let r=this.projectVecOntoPlane(t,n),i=p();g(i,t,-1);let a=p();y(a,i,r),_(r,r),_(a,a),this.directionMatrix=d(r[0],r[1],r[2],a[0],a[1],a[2],i[0],i[1],i[2])}toString(){return String(this.directionMatrix)+String(this.location)}projectVecOntoPlane(e,t){let n=g(p(),e,v(e,t));return h(p(),t,n)}setUniforms(e,t){let n=e.getUniformLocation(t,`u_camPosition`),r=e.getUniformLocation(t,`u_camOrientation`);e.uniform3fv(n,this.location),e.uniformMatrix3fv(r,!1,this.directionMatrix)}},C=class{ior;translucence;reflectance;diffuse;absorption;emission;color;constructor(e,t,n,r,i,a,o){this.ior=e,this.translucence=t,this.reflectance=n,this.diffuse=r,this.absorption=i,this.emission=a,this.color=o,this.checkRep()}checkRep(){if(this.translucence+this.reflectance+this.diffuse+this.absorption!==1)throw Error(`Invalid material`)}static size(){return 12}writeMaterialData(e,t){e[t]=this.ior,e[t+1]=this.translucence,e[t+2]=this.reflectance,e[t+3]=this.diffuse,e[t+4]=this.absorption,e[t+5]=this.emission,e[t+6]=0,e[t+7]=0,e[t+8]=this.color[0],e[t+9]=this.color[1],e[t+10]=this.color[2],e[t+11]=0}},w=class{position;radius;material;constructor(e,t,n){this.position=e,this.radius=t,this.material=n}static get size(){return 4+C.size()}writeObjectData(e,t){e[t]=this.position[0],e[t+1]=this.position[1],e[t+2]=this.position[2],e[t+3]=this.radius,this.material.writeMaterialData(e,t+4)}},T=class{vert1;vert2;vert3;material;constructor(e,t,n,r){this.vert1=e,this.vert2=t,this.vert3=n,this.material=r}static get size(){return 12+C.size()}writeObjectData(e,t){this.writeVertexData(e,t,this.vert1),this.writeVertexData(e,t+4,this.vert2),this.writeVertexData(e,t+8,this.vert3),this.material.writeMaterialData(e,t+12)}writeVertexData(e,t,n){for(let r=0;r<3;r++)e[t+r]=n[r];e[t+3]=0}},E=class{direction;intensity;sunCosineThreshold;sunColor;globalIllumination;u_GLOBAL_LIGHT_name=`GLOBAL_LIGHT`;constructor(e,t,n,r,i){this.direction=e,this.intensity=t,this.sunCosineThreshold=n,this.sunColor=r,this.globalIllumination=i}setUniforms(e,t){e.uniform3fv(e.getUniformLocation(t,`${this.u_GLOBAL_LIGHT_name}.sun`),this.direction),e.uniform1f(e.getUniformLocation(t,`${this.u_GLOBAL_LIGHT_name}.sunIntensity`),this.intensity),e.uniform1f(e.getUniformLocation(t,`${this.u_GLOBAL_LIGHT_name}.sunCosineThreshold`),this.sunCosineThreshold),e.uniform3fv(e.getUniformLocation(t,`${this.u_GLOBAL_LIGHT_name}.sunColor`),this.sunColor),e.uniform3fv(e.getUniformLocation(t,`${this.u_GLOBAL_LIGHT_name}.globalIllumination`),this.globalIllumination)}}}));t((()=>{r(),a(),c(),x(),D();var e=5,t=15,l=new C(1,0,0,1,0,0,m(1,1,1)),u=class{canvas;gl;spheres=[new w(m(0,0,0),0,l)];triangles=[new T(m(0,0,0),m(0,0,0),m(0,0,0),l)];globalLight;camera;uniforms=new Map;program;maxBounces=e;fragShaderSource=i;sampleNumber=0;pingPongBuffers;objectBuffer;cameraOffset=[0,0];raysPerFrame=10;itersPerRender=1e4;constructor(e,t){this.canvas=e,this.gl=t,window.addEventListener(`resize`,this.resize);let n=!1,r=!0;window.addEventListener(`mousemove`,e=>{n||window.requestAnimationFrame(()=>{if(r){let t=e.offsetX-this.cameraOffset[0],n=e.offsetY-this.cameraOffset[1];this.moveCamera(-1.5*t/this.canvas.width,1-n/this.canvas.height)}n=!1}),n=!0}),window.addEventListener(`mousedown`,e=>{this.cameraOffset=[e.offsetX-this.cameraOffset[0],e.offsetY-this.cameraOffset[1]],r=!r,console.log(this.cameraOffset)}),this.objectBuffer=this.gl.createBuffer(),this.program=this.compileShaders(),this.gl.useProgram(this.program),this.pingPongBuffers=new d(t,e.width,e.height),this.resize(),this.bindVertexBuffer(),this.camera=this.moveCamera(0,0),console.log(this.camera.toString()),this.globalLight=new E(m(0,-1,-.5),1,.7,m(1,1,1),m(.3,.3,.3)),this.renderLoop()}render(){this.sampleNumber++;let{readTexture:e,writeBuffer:t}=this.pingPongBuffers.getBufferTexture();this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,t),this.gl.activeTexture(this.gl.TEXTURE0),this.gl.bindTexture(this.gl.TEXTURE_2D,e),this.setRenderingUniforms(),this.gl.drawArrays(this.gl.TRIANGLES,0,6),this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER,t),this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER,null),this.gl.clearColor(0,0,0,1),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.gl.blitFramebuffer(0,0,this.canvas.width,this.canvas.height,0,0,this.canvas.width,this.canvas.height,this.gl.COLOR_BUFFER_BIT,this.gl.NEAREST)}moveCamera(e,n){let r=e*2*Math.PI%(2*Math.PI),i=n*Math.PI%(2*Math.PI),a=m(t*Math.sin(i)*Math.cos(r),t*Math.sin(i)*Math.sin(r),t*Math.cos(i)),o=p();g(o,a,-3/t);let s=p();return y(s,o,m(0,1e-11,1)),_(s,s),this.camera=new S(a,o,s),this.sampleNumber=0,this.camera}renderLoop=()=>{this.sampleNumber*this.raysPerFrame<this.itersPerRender?this.render():this.sampleNumber===Math.floor(this.itersPerRender/this.raysPerFrame)&&(this.sampleNumber++,console.log(`render done`)),requestAnimationFrame(this.renderLoop)};resize=()=>{this.canvas.width=window.innerWidth,this.canvas.height=window.innerHeight,this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.pingPongBuffers=this.pingPongBuffers.resize(this.canvas.width,this.canvas.height),this.sampleNumber=0;let e=this.uniforms.get(`u_resolution`);this.gl.uniform2f(e,this.gl.canvas.width,this.gl.canvas.height)};compileShaders(){this.fragShaderSource=this.fragShaderSource.replace(/const int MAX_BOUNCES = \d+;/,`const int MAX_BOUNCES = ${this.maxBounces};`),this.fragShaderSource=this.fragShaderSource.replace(/const int NUM_SPHERES = \d+;/,`const int NUM_SPHERES = ${this.spheres.length};`),this.fragShaderSource=this.fragShaderSource.replace(/const int NUM_TRIANGLES = \d+;/,`const int NUM_TRIANGLES = ${this.triangles.length};`),this.fragShaderSource=this.fragShaderSource.replace(/const int num_rays = \d+;/,`const int num_rays = ${this.raysPerFrame};`);let e=o(this.gl,this.gl.VERTEX_SHADER,n),t=o(this.gl,this.gl.FRAGMENT_SHADER,this.fragShaderSource);this.program=s(this.gl,e,t);for(let e of[`u_resolution`,`u_sample`,`u_time`,`u_previousFrame`]){let t=this.gl.getUniformLocation(this.program,e);if(t===null)throw Error(`Cannot find uniform ${e}`);this.uniforms.set(e,t)}this.gl.bindBuffer(this.gl.UNIFORM_BUFFER,this.objectBuffer),this.gl.bufferData(this.gl.UNIFORM_BUFFER,this.generateObjectData(),this.gl.DYNAMIC_DRAW),this.gl.bindBuffer(this.gl.UNIFORM_BUFFER,null);let r=this.gl.getUniformBlockIndex(this.program,`objectBuffer`);return this.gl.uniformBlockBinding(this.program,r,1),this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER,1,this.objectBuffer),this.program}bindVertexBuffer(){let e=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,e),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,-1,1,1,1]),this.gl.STATIC_DRAW)}setRenderingUniforms(){let e=this.gl.getAttribLocation(this.program,`a_position`);this.gl.enableVertexAttribArray(e),this.gl.vertexAttribPointer(e,2,this.gl.FLOAT,!1,0,0);let t=this.uniforms.get(`u_resolution`),n=this.uniforms.get(`u_sample`),r=this.uniforms.get(`u_time`),i=this.uniforms.get(`u_previousFrame`);this.gl.uniform2f(t,this.gl.canvas.width,this.gl.canvas.height),this.gl.uniform1i(n,this.sampleNumber),this.gl.uniform1i(r,performance.now()),this.gl.uniform1i(i,0),this.camera.setUniforms(this.gl,this.program),this.globalLight.setUniforms(this.gl,this.program),this.gl.bindBuffer(this.gl.UNIFORM_BUFFER,this.objectBuffer),this.gl.bufferSubData(this.gl.UNIFORM_BUFFER,0,this.generateObjectData())}generateObjectData(){let e=new Float32Array(this.spheres.length*w.size+this.triangles.length*T.size),t=0;for(let n of this.spheres)n.writeObjectData(e,t),t+=w.size;for(let n of this.triangles)n.writeObjectData(e,t),t+=T.size;return e}addSphere(e){this.spheres.push(e),this.program=this.compileShaders(),this.gl.useProgram(this.program),this.sampleNumber=0}addTriangle(e){this.triangles.push(e),this.program=this.compileShaders(),this.gl.useProgram(this.program),this.sampleNumber=0}clearScene(){this.spheres.length=0,this.spheres.push(new w(m(0,0,0),0,l)),this.triangles.length=0,this.triangles.push(new T(m(0,0,0),m(0,0,0),m(0,0,0),l)),this.sampleNumber=0}setMaxBounces(e){this.maxBounces=e,this.program=this.compileShaders(),this.gl.useProgram(this.program),this.sampleNumber=0}setRaysPerFrame(e){this.raysPerFrame=e,this.program=this.compileShaders(),this.gl.useProgram(this.program),this.sampleNumber=0}setMaxIters(e){this.itersPerRender=e}},d=class e{gl;width;height;buffers;textures;currentReadIndex=1;constructor(e,t,n){this.gl=e,this.width=t,this.height=n,this.buffers=[e.createFramebuffer(),e.createFramebuffer()],this.textures=[e.createTexture(),e.createTexture()];for(let r=0;r<2;r++)e.bindTexture(e.TEXTURE_2D,this.textures[r]),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,t,n,0,e.RGBA,e.FLOAT,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,this.buffers[r]),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.textures[r],0);e.bindTexture(e.TEXTURE_2D,null),e.bindFramebuffer(e.FRAMEBUFFER,null)}getBufferTexture(){return this.swapBuffers(),{writeBuffer:this.buffers[(this.currentReadIndex+1)%2],readTexture:this.textures[this.currentReadIndex]}}resize(t,n){if(this.width===t&&this.height===n)return this;for(let e=0;e<2;e++)this.gl.deleteTexture(this.textures[e]),this.gl.deleteFramebuffer(this.buffers[e]);return new e(this.gl,t,n)}swapBuffers(){this.currentReadIndex=(this.currentReadIndex+1)%2}},f=document.getElementById(`webgl-canvas`),h=f.getContext(`webgl2`,{antialias:!1});if(h===null)throw Error(`Webgl not supported`);if(!h.getExtension(`EXT_color_buffer_float`))throw Error(`Floating point render targets not supported`);var v=new u(f,h);function b(e){if(v.clearScene(),e===0){let e=new C(1,0,.05,.95,0,0,m(.9,.85,.75)),t=new C(1.33,1,0,0,0,0,m(.9,.95,1)),n=new C(1.5,0,.1,.9,0,0,m(.4,.4,.42)),r=new C(1,0,0,1,0,10,m(1,.6,.3));v.addTriangle(new T(m(-20,-20,-1.5),m(20,-20,-1.5),m(20,20,-1.5),e)),v.addTriangle(new T(m(-20,-20,-1.5),m(20,20,-1.5),m(-20,20,-1.5),e)),v.addSphere(new w(m(0,0,0),1.5,t)),v.addSphere(new w(m(-2.2,-1,-.8),.7,n)),v.addSphere(new w(m(1.8,-1.8,-1),.5,n)),v.addSphere(new w(m(2.5,1,-.5),1,n)),v.addSphere(new w(m(-2,2.5,1),.8,r))}else if(e===1){let e=new C(1,0,.3,.7,0,0,m(.6,.6,.65)),t=new C(1,0,0,1,0,1.5,m(.8,.8,1)),n=new C(1,0,1,0,0,0,m(.9,.9,.9)),r=new C(1,0,0,1,0,18,m(1,.2,.8)),i=new C(1,0,0,1,0,18,m(.2,.8,1));v.addTriangle(new T(m(-20,-20,-2),m(20,-20,-2),m(20,20,-2),e)),v.addTriangle(new T(m(-20,-20,-2),m(20,20,-2),m(-20,20,-2),e)),v.addSphere(new w(m(0,0,15),5,t)),v.addSphere(new w(m(0,0,0),1.5,n)),v.addSphere(new w(m(-2.5,-2.5,-1),.4,r)),v.addSphere(new w(m(2.5,2.5,.5),.6,i)),v.addSphere(new w(m(-2,3,-.5),.3,r))}else if(e===2){let e=new C(1,0,.5,.5,0,0,m(1,.75,.3)),t=new C(1,0,0,1,0,12,m(.1,.9,.7)),n=new C(1.6,.85,.15,0,0,0,m(.9,1,.95));v.addTriangle(new T(m(-20,-20,-3),m(20,-20,-3),m(20,20,-3),e)),v.addTriangle(new T(m(-20,-20,-3),m(20,20,-3),m(-20,20,-3),e)),v.addSphere(new w(m(0,0,-1),1.2,t)),v.addTriangle(new T(m(0,-1,3),m(2.5,-2.5,-3),m(-2.5,-2.5,-3),n)),v.addTriangle(new T(m(0,-1,3),m(0,2.5,-3),m(2.5,-2.5,-3),n)),v.addTriangle(new T(m(0,-1,3),m(-2.5,-2.5,-3),m(0,2.5,-3),n))}else if(e===3){let e=new C(1,0,.1,.9,0,0,m(.8,.95,.85)),t=new C(1,0,0,1,0,0,m(1,.75,.65)),n=new C(1.4,0,.3,.7,0,0,m(.75,.65,1)),r=new C(1.1,.95,.05,0,0,0,m(1,1,1)),i=new C(1,0,0,1,0,5,m(1,.95,.9));v.addTriangle(new T(m(-15,-15,-1.5),m(15,-15,-1.5),m(15,15,-1.5),e)),v.addTriangle(new T(m(-15,-15,-1.5),m(15,15,-1.5),m(-15,15,-1.5),e)),v.addSphere(new w(m(-1.2,.5,-.5),1,t)),v.addSphere(new w(m(1.2,-.8,-.7),.8,n)),v.addSphere(new w(m(0,0,.2),1.2,r)),v.addSphere(new w(m(-2,-1.5,1.5),.6,i)),v.addSphere(new w(m(2,2,1),.5,i))}else if(e===4)for(let e=0;e<10;e++)v.addSphere(new w(m((Math.random()-.5)*6,(Math.random()-.5)*6,(Math.random()-.5)*6),Math.random(),new C(1.5,1,0,0,0,.1,m(Math.random(),Math.random(),Math.random())))),v.addSphere(new w(m((Math.random()-.5)*6,(Math.random()-.5)*6,(Math.random()-.5)*6),Math.random(),new C(1.5,0,1,0,0,.1,m(Math.random(),Math.random(),Math.random())))),v.addSphere(new w(m((Math.random()-.5)*6,(Math.random()-.5)*6,(Math.random()-.5)*6),Math.random(),new C(1.5,0,0,1,0,.1,m(Math.random(),Math.random(),Math.random()))))}b(0),document.getElementById(`scene-selector`).addEventListener(`change`,e=>{console.log(parseInt(e.target.value)),console.log(e.target.value),b(parseInt(e.target.value))});var O=document.getElementById(`bounces-slider`),k=document.getElementById(`bounces-value`);O.addEventListener(`input`,e=>{let t=parseInt(e.target.value);k.innerText=t.toString(),v.setMaxBounces(t)});var A=document.getElementById(`rays-per-frame-slider`),j=document.getElementById(`rays-per-frame-value`);A.addEventListener(`input`,e=>{let t=parseInt(e.target.value);j.innerText=t.toString(),v.setRaysPerFrame(t)});var M=document.getElementById(`max-iters-slider`),N=document.getElementById(`max-iters-value`);M.addEventListener(`input`,e=>{let t=parseInt(e.target.value);N.innerText=t.toString(),v.setMaxIters(t)})}))();