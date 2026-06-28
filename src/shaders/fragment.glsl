#version 300 es
precision highp float;

#define TWO_PI 6.28318530718
#define PI 3.14159265359;

uniform vec2 u_resolution;

const int MAX_BOUNCES = 7;
uniform int u_sample;
uniform int u_time;

uniform vec3 u_camPosition;
uniform mat3 u_camOrientation;

// uniform sampler2D u_previousFrame; // I'll deal with this at a later date

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

    hash &= 0x007FFFFFu; // Keep the 23 mantissa bits
    hash |= 0x3F800000u; // Set the exponent bits to 1.0
    return uintBitsToFloat(hash) - 1.0; 
}

struct Ray {
    vec3 position;
    vec3 direction;
    float ior;
};

// Material types: 0 = glass, 1 = diffuse, 2 = metallic, 3 = emission
struct Material {
    float ior;
    float translucence;
    float reflectance;
    float diffuse;
    float absorption;
    float emission;
    vec3 color;
};

const Material DEFAULT_MATERIAL = Material(
    0.,
    0.,
    0.,
    0.,
    0.,
    0.,
    vec3(1.)
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

Sphere spheres[NUM_SPHERES] = Sphere[](
    Sphere(
        vec3(-1., 0., 0.),
        1.,
        Material(
            1.5,
            0.0,
            1.,
            0.,
            0.,
            0.,
            vec3(0.78f, 0.21f, 0.21f)
        )
    ),
    Sphere(
        vec3(0.7, 2.0, -0.1),
        1.,
        Material(
            1.5,
            .0,
            0.0,
            1.,
            0.,
            0.,
            vec3(0.9f)
        )
    ),
    Sphere(
        vec3(-3., 2., 0.4),
        1.,
        Material(
            1.5,
            0.,
            .0,
            1.,
            0.,
            0.,
            vec3(0.21f, 0.51f, 0.78f)
        )
    )
);

const int NUM_TRIANGLES = 2;
Triangle triangles[NUM_TRIANGLES] = Triangle[](
    Triangle(
        vec3(5., 5., -0.7),
        vec3(-5., -5., -0.7),
        vec3(-5., 5., -0.7),
        Material(
            1.5,
            0.,
            1.,
            0.,
            0.,
            .0,
            vec3(0.28f, 0.78f, 0.21f)
        )
    ),
    Triangle(
        vec3(5., 5., -0.7),
        vec3(-5., -5., -0.7),
        vec3(5., -5., -0.7),
        Material(
            1.5,
            0.,
            1.,
            0.,
            0.,
            .0,
            vec3(0.28f, 0.78f, 0.21f)
        )
    )
);

const vec3 GLOBAL_SUN = vec3(-0., 1., 0.5) * 2.; // sun location
const vec3 GLOBAL_ILLUMINATION = vec3(0.3);

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

// uses Moller-Trumbore algorithm to compute collision with triangle
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

// approximates the fresnel effect of light entering a refractive surface
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

// Updates path throughput for given intersection, updating currentRay to the new ray direction
vec3 updateThroughput(vec3 currentThroughput, Intersection intersection, inout Ray currentRay) {
    float intersectTypeSelector = next_rand();

    if (intersectTypeSelector < intersection.material.translucence) {
        // transmission scenario
        // float newIOR = intersection.material.ior == currentRay.ior? 1.0: intersection.material.ior;
        // vec3 newDir = refract(currentRay.direction, intersection.normal, currentRay.ior / newIOR);
        // currentRay = Ray(
        //     currentRay.position + intersection.t * currentRay.direction - 0.0001 * intersection.normal,
        //     newDir == vec3(0.)? reflect(currentRay.direction, intersection.normal) : newDir,
        //     newIOR
        // );

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
        // reflection scenario
        currentRay = Ray(
            currentRay.position + intersection.t * currentRay.direction + 0.0001 * intersection.normal,
            reflect(currentRay.direction, intersection.normal),
            currentRay.ior
        );
    } else if (intersectTypeSelector < intersection.material.translucence + intersection.material.reflectance + intersection.material.diffuse){
        // diffuse scenario
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
        // start with blank far away intersection
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
            // ray has escaped, so check dot product with global sun
            float sunIntensity = step(1.1, dot(currentRay.direction, GLOBAL_SUN));
            accumulatedLight += pathThroughput * sunIntensity + pathThroughput * GLOBAL_ILLUMINATION;
            break;
        } else {
            // ray hit a surface
            accumulatedLight += closestIntersection.material.emission * closestIntersection.material.color * pathThroughput;
            pathThroughput = updateThroughput(pathThroughput, closestIntersection, currentRay);
        }
    }

    return vec3(accumulatedLight);
}


// compute (-1, 1) coordinates for screen
vec2 normalizeCoords() {
    return (gl_FragCoord.xy / u_resolution) * 2. + vec2(-1., -1.);
}

void main() {
    init_rng();
    vec2 uv = normalizeCoords();
    vec3 coords = vec3(uv.x * u_resolution.x / u_resolution.y, uv.y, -1.); // note -1 because if ihat points right, khat points out of page
    vec3 rayDirection = normalize(u_camOrientation * coords);
    Ray fromCamera = Ray(u_camPosition, rayDirection, 1.0);

    const int num_rays = 500;
    vec3 runningSum = vec3(0.);
    for (int i = 0; i < num_rays; i++) {
        runningSum = runningSum + tracePath(fromCamera);
    }
    
    outColor = vec4(runningSum / float(num_rays), 1.0);
}