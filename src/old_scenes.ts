
    // if (sceneIndex === 0) {
    //     renderer.addSphere(new Sphere(vec3.fromValues(0, 0, 0), 1, BASIC_MATERIAL));
    //     renderer.addTriangle(new Triangle(
    //         vec3.fromValues(5, 5, 0),
    //         vec3.fromValues(-5, -5, 0),
    //         vec3.fromValues(-5, 5, 0),
    //         BASIC_MATERIAL
    //     ))
    // } else if (sceneIndex === 1) {
    //     const glass = new Material(
    //         1.5,
    //         1,
    //         0,
    //         0,
    //         0,
    //         0,
    //         vec3.fromValues(0.9, 0.9, 0.9)
    //     )
    //     const faces = [
    //         [vec3.fromValues(1, 0, 0), vec3.fromValues(0, 1, 0), vec3.fromValues(0, 0, 1)],
    //         [vec3.fromValues(1, 0, 0), vec3.fromValues(0, 1, 0), vec3.fromValues(0, 0, 0)],
    //         [vec3.fromValues(1, 0, 0), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 1)],
    //         [vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0), vec3.fromValues(0, 0, 1)]
    //     ]
        
    //     for (const verts of faces) {
    //         renderer.addTriangle(new Triangle(verts[0], verts[1], verts[2], glass));
    //     }
        
    //     renderer.addTriangle(new Triangle(
    //         vec3.fromValues(5, 5, 0),
    //         vec3.fromValues(-5, -5, 0),
    //         vec3.fromValues(-5, 5, 0),
    //         BASIC_MATERIAL
    //     ))
    // } else if (sceneIndex === 2) {
    //     const BOX_SIZE = 7

    //     for (let i = 0; i < 20; i++) {
    //         renderer.addSphere(new Sphere(
    //             vec3.fromValues((Math.random()-0.5) * BOX_SIZE, (Math.random() - 0.5) * BOX_SIZE, (Math.random() - 0.5) * BOX_SIZE),
    //             Math.random(),
    //             new Material(
    //                 1.5,
    //                 1,
    //                 0,
    //                 0,
    //                 0,
    //                 0.1,
    //                 vec3.fromValues(Math.random(), Math.random(), Math.random())
    //             )
    //         ));

    //         renderer.addSphere(new Sphere(
    //             vec3.fromValues((Math.random()-0.5) * BOX_SIZE, (Math.random() - 0.5) * BOX_SIZE, (Math.random() - 0.5) * BOX_SIZE),
    //             Math.random(),
    //             new Material(
    //                 1.5,
    //                 0,
    //                 1,
    //                 0,
    //                 0,
    //                 0.1,
    //                 vec3.fromValues(Math.random(), Math.random(), Math.random())
    //             )
    //         ));

    //         renderer.addSphere(new Sphere(
    //             vec3.fromValues((Math.random()-0.5) * BOX_SIZE, (Math.random() - 0.5) * BOX_SIZE, (Math.random() - 0.5) * BOX_SIZE),
    //             Math.random(),
    //             new Material(
    //                 1.5,
    //                 0,
    //                 0,
    //                 1,
    //                 0,
    //                 0.1,
    //                 vec3.fromValues(Math.random(), Math.random(), Math.random())
    //             )
    //         ))
    //     }

    // } else if (sceneIndex === 3) {
    //     const matRed = new Material(1, 0, 0, 1, 0, 0, vec3.fromValues(0.8, 0.1, 0.1));
    //     const matGreen = new Material(1, 0, 0, 1, 0, 0, vec3.fromValues(0.1, 0.8, 0.1));
    //     const matWhite = new Material(1, 0, 0, 1, 0, 0, vec3.fromValues(0.9, 0.9, 0.9));
    //     const matMirror = new Material(1, 0, 1, 0, 0, 0, vec3.fromValues(0.95, 0.95, 0.95));
    //     const matGlass = new Material(1.5, 1, 0, 0, 0, 0, vec3.fromValues(0.95, 0.95, 1.0));
    //     const matLight = new Material(1, 0, 0, 1, 0, 15, vec3.fromValues(1, 0.9, 0.8)); 

    //     // Floor & Ceiling (White)
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-5, -5, -5), vec3.fromValues(5, -5, -5), vec3.fromValues(5, 5, -5), matWhite));
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-5, -5, -5), vec3.fromValues(5, 5, -5), vec3.fromValues(-5, 5, -5), matWhite));
        
    //     // Back Wall (White)
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-5, 5, -5), vec3.fromValues(5, 5, -5), vec3.fromValues(5, 5, 5), matWhite));
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-5, 5, -5), vec3.fromValues(5, 5, 5), vec3.fromValues(-5, 5, 5), matWhite));

    //     // Left Wall (Red)
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-5, -5, -5), vec3.fromValues(-5, 5, -5), vec3.fromValues(-5, 5, 5), matRed));
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-5, -5, -5), vec3.fromValues(-5, 5, 5), vec3.fromValues(-5, -5, 5), matRed));

    //     // Right Wall (Green)
    //     renderer.addTriangle(new Triangle(vec3.fromValues(5, -5, -5), vec3.fromValues(5, 5, -5), vec3.fromValues(5, 5, 5), matGreen));
    //     renderer.addTriangle(new Triangle(vec3.fromValues(5, -5, -5), vec3.fromValues(5, 5, 5), vec3.fromValues(5, -5, 5), matGreen));

    //     // Ceiling Light
    //     renderer.addSphere(new Sphere(vec3.fromValues(0, 0, 6), 2.5, matLight));

    //     // The Showcase Subjects
    //     renderer.addSphere(new Sphere(vec3.fromValues(-2, 0, -3.5), 1.5, matGlass));
    //     renderer.addSphere(new Sphere(vec3.fromValues(2, 2, -3.5), 1.5, matMirror));

    // } else if (sceneIndex === 4) {
    //     const matGlossyFloor = new Material(1.0, 0, 0.4, 0.6, 0, 0, vec3.fromValues(0.15, 0.15, 0.15));
    //     const matFlintGlass = new Material(1.65, 1, 0, 0, 0, 0, vec3.fromValues(0.9, 0.9, 0.95));

    //     const lightRed = new Material(1, 0, 0, 1, 0, 20, vec3.fromValues(1, 0.1, 0.1));
    //     const lightBlue = new Material(1, 0, 0, 1, 0, 20, vec3.fromValues(0.1, 0.3, 1));
    //     const lightGreen = new Material(1, 0, 0, 1, 0, 20, vec3.fromValues(0.1, 1, 0.2));

    //     // Vast Glossy Floor
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-20, -20, -2), vec3.fromValues(20, -20, -2), vec3.fromValues(20, 20, -2), matGlossyFloor));
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-20, -20, -2), vec3.fromValues(20, 20, -2), vec3.fromValues(-20, 20, -2), matGlossyFloor));

    //     // Central Glass Tetrahedron (Pyramid)
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-3, -2, -2), vec3.fromValues(3, -2, -2), vec3.fromValues(0, 1, 3), matFlintGlass));
    //     renderer.addTriangle(new Triangle(vec3.fromValues(3, -2, -2), vec3.fromValues(0, 4, -2), vec3.fromValues(0, 1, 3), matFlintGlass));
    //     renderer.addTriangle(new Triangle(vec3.fromValues(0, 4, -2), vec3.fromValues(-3, -2, -2), vec3.fromValues(0, 1, 3), matFlintGlass));
    //     renderer.addTriangle(new Triangle(vec3.fromValues(-3, -2, -2), vec3.fromValues(0, 4, -2), vec3.fromValues(3, -2, -2), matFlintGlass));

    //     // Orbiting Neon Lights
    //     renderer.addSphere(new Sphere(vec3.fromValues(-4, -1, 0.5), 0.5, lightRed));
    //     renderer.addSphere(new Sphere(vec3.fromValues(4, 2, 1.5), 0.5, lightBlue));
    //     renderer.addSphere(new Sphere(vec3.fromValues(0, -4, 1), 0.5, lightGreen));
    // }