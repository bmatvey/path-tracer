#version 300 es
precision highp float;

uniform vec2 u_resolution;
// const vec2 u_resolution = vec2(1000., 1000.);

uniform int u_maxBounces;
uniform int u_sample;

uniform vec3 u_camPosition;
uniform mat3 u_camOrientation;

// uniform sampler2D u_previousFrame; // I'll deal with this at a later date

out vec4 outColor;

struct Ray {
    vec3 position;
    vec3 direction;
};

// Material types: 0 = glass, 1 = diffuse, 2 = metallic, 3 = emission
struct Material {
    int type;
    vec3 color;
};

vec3 tracePath(Ray ray) {
    float dotProduct = dot(ray.direction, vec3(-1., 0., 0.));
    vec3 colorResult = (dotProduct > 0.7) ? vec3(1.): vec3(0.5);
    return vec3(colorResult);
}


// compute (-1, 1) coordinates for screen
vec2 normalizeCoords() {
    return (gl_FragCoord.xy / u_resolution) * 2. + vec2(-1, -1);
}

void main() {
    vec3 coords = vec3(normalizeCoords(), -1.); // note -1 because if ihat points right, khat points out of page
    vec3 rayDirection = normalize(u_camOrientation * coords);
    Ray fromCamera = Ray(u_camPosition, rayDirection);
    outColor = vec4(tracePath(fromCamera), 1.0);
}