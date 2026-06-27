#version 300 es
precision highp float;

uniform vec2 u_resolution;

const int MAX_BOUNCES = 10;
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
    float diffuse;
    float reflectance;
    float emission;
    vec3 color;
};

const Material DEFAULT_MATERIAL = Material(
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

struct Intersection {
    float t;
    vec3 normal;
    Material material;
};

const int NUM_SPHERES = 2;

Sphere spheres[NUM_SPHERES] = Sphere[](
    Sphere(
        vec3(-1., 0., 0.),
        1.,
        Material(
            1.5,
            0.,
            1.,
            0.,
            0.1,
            vec3(0.78f, 0.21f, 0.21f)
        )
    ),
    Sphere(
        vec3(-1., 2.5, 0.),
        1.,
        Material(
            1.5,
            0.,
            1.,
            0.,
            0.1,
            vec3(0.13f, 0.25f, 0.64f)
        )
    )
);

const vec3 GLOBAL_SUN = vec3(1., 1., 1.);
const vec3 GLOBAL_ILLUMINATION = vec3(0.1);

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

// Updates path throughput for given intersection, updating currentRay to the new ray direction
vec3 updateThroughput(vec3 currentThroughput, Intersection intersection, inout Ray currentRay) {
    currentRay.position = currentRay.position + intersection.t * currentRay.direction + 0.0001 * intersection.normal;
    currentRay.direction = reflect(currentRay.direction, intersection.normal);
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
        if (closestIntersection.t > 1.e19) {
            // ray has escaped, so check dot product with global sun
            float sunIntensity = step(0., dot(currentRay.direction, GLOBAL_SUN));
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
    vec3 coords = vec3(normalizeCoords(), -1.); // note -1 because if ihat points right, khat points out of page
    vec3 rayDirection = normalize(u_camOrientation * coords);
    Ray fromCamera = Ray(u_camPosition, rayDirection, 1.0);

    const int num_rays = 1000;
    vec3 runningSum = vec3(0.);
    for (int i = 0; i < num_rays; i++) {
        runningSum = runningSum + tracePath(fromCamera);
    }
    
    outColor = vec4(runningSum / float(num_rays), 1.0);
}