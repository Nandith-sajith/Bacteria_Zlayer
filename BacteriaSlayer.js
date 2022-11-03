/*
  Bacteria Slayer
  Nandith Sajith - 0870240
  Akhil Jaison - 0870628
  Computer Graphics Project
  Lakehead University
*/

var main = function(){

  var maxBact = 10;
  var spawn = 25;
  var bactLeft = 20;
  var score = 0;
  var bacAlive = 0;
  var cPoints = [];
  var lightUp = true; 
  let bact = [];
  var canvas = document.getElementById('game-surface');

  var textCanvas = document.getElementById('text');
  var ctx = textCanvas.getContext('2d')

  ctx.font = "25px Verdana";
  ctx.textAlign = "center";

  document.body.style.margin = 0;
  canvas.width = 1000;
  canvas.height = 800;

  let lightPoint = vec3.fromValues(1.0, 2.0, 1.0);
  let lightColour = vec3.fromValues(1.0, 1.0, 1.0);

  let sphereRes = 5;

  let aBall = {
    centre: vec2.fromValues(canvas.width / 2, canvas.height / 2),
    radius: (Math.min(canvas.width, canvas.height) - 10) / 2.0
  };

  // WebGL Initialization
  let gl = canvas.getContext("webgl");

  let clearColor = [0.2, 0.2, 0.2, 1.0];

  gl.clearColor(clearColor[0],
                clearColor[1],
                clearColor[2],
                clearColor[3]);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  // Uniforms and attributes
  var uniforms = [
    "modelMatrix",
    "viewMatrix",
    "projectionMatrix",

    "one_colour",
    "single_colour",

    "light_point",
    "light_colour",

    "light_ambient",
    "light_diffuse",
    "light_specular",
  ];

  var attributes = [
    "point",
    "colour",
    "normal"
  ];

  let glEnv = new GLEnvironment(gl,
      vertexShaderCode, fragmentShaderCode,
      uniforms, attributes);

  gl.useProgram(glEnv.shader);
  gl.uniform1f(glEnv.uniforms.one_colour, 0.0);

  let ball = new Sphere(glEnv, sphereRes);

  let lookFrom = [0.0, 0.0, 3.0];
  let lookAt = [0.0, 0.0, 0.0];
  let up = [0.0, 1.0, 0.0];

  let viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, lookFrom, lookAt, up);

  var fov = glMatrix.toRadian(60);
  var width = canvas.width;
  var height = canvas.height;
  var aspect = width/height;
  var near = 0.1;
  var far = 100.0;

  let projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fov, aspect, near, far);

  let bactIds = new Set();
  for (var i = 0; i < maxBact; i++) {
    bactIds.add(i + 2);
  }

  maxBact = bactIds.size;

  var bactColMap = new Map();

  var idIterate = bactIds.entries();

  for (let i = 0; i < bactIds.size; i++) {
    let hue =  i * 360.0 / bactIds.size;

    let stop = hsl2rgb([hue, 1.0, 0.8 - 0.2 * (i % 2)]);
    let start = hsl2rgb([hue, 1.0, 0.4 - 0.2 * (i % 2)]);

    bactColMap.set(idIterate.next().value[0], [
      vec4.fromValues(start[0], start[1], start[2], 1.0),
      vec4.fromValues(stop[0], stop[1], stop[2], 1.0)
    ]);
  }

  canvas.addEventListener('click', click());
  canvas.addEventListener('mousemove', mouseMove());
  canvas.addEventListener('mousedown', mouseDown());
  canvas.addEventListener('mouseup', mouseUp());

  document.oncontextmenu = function() {
    return false;
  }

  // Button for toggling the light
  document.getElementById("light").onclick = function(e) {toggleLight(e)};

  function toggleLight(e) {
    if(lightUp){
      lightUp = false;
      e.target.textContent = "Off";
      e.target.style.color = "red";
    } else {
      lightUp = true;
      e.target.textContent = "On";
      e.target.style.color = "green";
    }
  }

  draw();

  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(glEnv.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(glEnv.uniforms.projectionMatrix, false,
                        projectionMatrix);

    if(lightUp){
      gl.uniform3fv(glEnv.uniforms.light_point, lightPoint);
      gl.uniform3fv(glEnv.uniforms.light_colour, lightColour);
    } else {
      gl.uniform3fv(glEnv.uniforms.light_colour, [0.0, 0.0, 0.0]);
    }

    ball.draw();

    bact.forEach(function(bacteria){bacteria.draw();});
  }

  function falseDraw() {
    gl.uniform1f(glEnv.uniforms.one_colour, 1.0);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    draw();
    gl.clearColor(clearColor[0],
                  clearColor[1],
                  clearColor[2],
                  clearColor[3]);
    gl.uniform1f(glEnv.uniforms.one_colour, 0.0);
  }

  function nextId() {
    let bucket = Array.from(bactIds);
    let id = bucket[Math.floor(Math.random() * bucket.length)];

    bactIds.delete(id);
    return id;
  }

  function spawnBacteria() {
    let frequency = 64;
    let radius = 0.05;

    if (Math.random() < 1.0 / frequency && bact.length < maxBact) {
      let r = vec3.fromValues(Math.random() - 0.5,
                              Math.random() - 0.5,
                              Math.random() - 0.5);
      vec3.normalize(r, r);

      let id = nextId();
      let colours = bactColMap.get(id);

      if(colours) {
        let bacteria = new Sphere(glEnv,
                                  sphereRes,
                                  r,
                                  radius,
                                  colours[0],
                                  colours[1],
                                  undefined,
                                  undefined,
                                  0.02);
        bacteria.id = id;

        let pole = vec3.fromValues(0.0, 0.0, 1.0);

        if (!vec3.equals(r, pole)) {
          let axis = vec3.cross(vec3.create(), pole, r);
          vec3.normalize(axis, axis);

          let angle = Math.acos(vec3.dot(pole, r));
          bacteria.rotation = mat4.rotate(mat4.create(), mat4.create(),
                                          angle, axis);
          bacteria.buildModel();
        }
        bacAlive++;
        bact.push(bacteria);
      }
    }
  }

  function growBacteria() {
    let incScalar = 0.0005;
    let inc = vec3.fromValues(incScalar, incScalar, incScalar);
    let max = incScalar *  5000;

    bact.forEach(function(bacteria){
      if (bacteria.scale[0] < max) {
        bacteria.radius += incScalar;
        vec3.add(bacteria.scale, bacteria.scale, inc);
        bacteria.buildModel();
      }
      if(bacteria.radius >= 0.35) {
        let id = bacteria.id;
        bacAlive--;
        spawn--;
        bact.splice(bact.indexOf(bacteria), 1);
        bactIds.add(id);
      }
    });
  }

  function gameLoop() {
    document.getElementById('scoreDisplay').innerHTML=score;
		document.getElementById('bactLeft').innerHTML=bactLeft;
		document.getElementById('spawn').innerHTML=spawn;

    if(!winOrLose()){
      if(bactLeft>0+bacAlive) {
        spawnBacteria();
      }

      growBacteria();
      collisionCheck();
      consumeBacteria();
      updateText();
      draw();
      requestAnimationFrame(gameLoop);
    }
  }

  function click() {
    return function(event) {
      let offset = elementOffset(event.target);
      let x = event.clientX - offset.x;
      let y = event.target.height - (event.clientY - offset.y);

      let colour = new Uint8Array(4);
      falseDraw();
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, colour);

      let id = colour2id(colour);

      let hit = false;
      let scoreInc = 0;

      for (let i = 0; i < bact.length; i++){
        if (bact[i].id == id){
          hit = true;
          scoreInc = Math.round(2/bact[i].radius);
          score += scoreInc
          bactLeft--;
          bacAlive--;
          cPoints.push({
  					pts: "+" + scoreInc,
  					x: event.clientX,
  					y: event.clientY,
  					dY: 0,
  					color: "rgba(0,200,0,"
  				});
          bact.splice(i, 1);
          bactIds.add(id);
          break;
        }
      }
      draw();
    };
  }

  function mouseDown() {
    return function(event) {
      if (event.button == 2){

        let offset = elementOffset(event.target);

        let height = event.target.height;

        let point = {
          x: (event.clientX - offset.x) - aBall.centre[0],
          y: (height - (event.clientY - offset.y)) - aBall.centre[1],
          z: 0
        };

        aBall.matrix_stash = mat4.copy(mat4.create(), viewMatrix);

        let d2 = point.x * point.x + point.y * point.y;
        let r2 = aBall.radius * aBall.radius;
        if (d2 < r2){
          point.z = Math.sqrt(r2 - d2);
        }

        aBall.start = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(aBall.start, aBall.start);
      }
    }
  }

  function mouseMove() {
    return function(event) {
      if ((event.buttons & 2) == 2 && aBall.start != null) {
        let offset = elementOffset(event.target);

        let height = event.target.height;

        let point = {
          x: (event.clientX - offset.x) - aBall.centre[0],
          y: (height - (event.clientY - offset.y)) - aBall.centre[1],
          z: 0
        };

        let d2 = point.x * point.x + point.y * point.y;
        let r2 = aBall.radius * aBall.radius;
        if (d2 < r2){
          point.z = Math.sqrt(r2 - d2);
        }

        aBall.end = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(aBall.end, aBall.end);

        let axis = vec3.cross(vec3.create(), aBall.start, aBall.end);
        let angle = Math.acos(vec3.dot(aBall.start, aBall.end));

        if (vec3.equals(aBall.start, aBall.end)) {
          mat4.copy(viewMatrix, aBall.matrix_stash);
        } else {
          let transform = mat4.create();

          // Translate into ball.
          let transIn = mat4.translate(mat4.create(), mat4.create(),
                                            vec3.fromValues(0.0, 0.0, 3.0));

          let rot = mat4.rotate(mat4.create(), mat4.create(), angle, axis);

          // Translate out of ball.
          let transOut = mat4.translate(mat4.create(), mat4.create(),
                                             vec3.fromValues(0.0, 0.0, -3.0));


          mat4.mul(transform, transIn, transform);
          mat4.mul(transform, rot, transform);
          mat4.mul(transform, transOut, transform);
          mat4.mul(viewMatrix, transform, aBall.matrix_stash);
        }
      }
    }
  }

  function mouseUp() {
    return function(event) {
      if ((event.button & 2) == 2){
        aBall.start = undefined;
      }
    }
  }

  function collisionCheck() {
    if(bact.length > 1) {
      for(let i = 0; i < bact.length - 2; i++) {
          for(let j = i+1; j < bact.length; j++) {
            if(!bact[i].consuming.includes(bact[j]) && !bact[j].consuming.includes(bact[i])) {
              if(distance3D(bact[i].centre, bact[j].centre) <= bact[i].radius + bact[j].radius) {
                if(bact[i].radius > bact[j].radius){
                  bact[i].consuming.push(bact[j]);
                } else {
                  bact[j].consuming.push(bact[i]);
                }
              }
            }
          }
        }
      }
    }

  function updateText() {
    for(i in cPoints) {
      let text = cPoints[i];
      text.dY--;

      if(text.dY <= -50) {
        cPoints.splice(i,1);
      } else {
        ctx.clearRect(text.x - 25, text.y + text.dY - 20, text.x + 20, text.y + 20);
        ctx.fillStyle = text.color + (1.0 - (text.dY * -0.02) + ")");
        ctx.fillText(text.pts, text.x, text.y + text.dY);
      }
    }
  }

  function consumeBacteria() {
    let decScalar = -0.0030;
    let dec = vec3.fromValues(decScalar, decScalar, decScalar);
    for(i in bact){
      for(j in bact[i].consuming) {
        let consumed = bact[i].consuming[j];
        consumed.radius -= 0.0015;
        vec3.add(consumed.scale, consumed.scale, dec);
        vec3.add(consumed.translation, consumed.translation, normalize3D(bact[i].centre, consumed.centre));
        if(consumed.radius <= 0.0) {
          let id = consumed.id;
          bacAlive--;
          bact.splice(bact.indexOf(consumed), 1);
          bact[i].consuming.splice(j, 1);
          bactIds.add(id);
        }
        consumed.buildModel();
      }
    }
  }

  function winOrLose() {
    if(bactLeft <= 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cPoints = [];
      ctx.fillStyle = "yellow";
			ctx.font = "80px Algerian";
			ctx.fillText("Victory!", canvas.width/2, canvas.height/2);
      return true;
    }
    if(spawn<=0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cPoints = [];
      bact = [];
      draw();
      ctx.fillStyle = "red";
			ctx.font = "80px Algerian";
			ctx.fillText("Defeat", canvas.width/2, canvas.height/2);
      return true;
    }
    return false;
  }

  gameLoop();
}

function id2colour(id) {
  if (id > 2<< (8 * 3)) return vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  let a = (id >> (8 * 0)) & (255);
  let b = (id >> (8 * 1)) & (255);
  let c = (id >> (8 * 2)) & (255);
  return vec4.fromValues(a / 255.0, b / 255.0, c / 255.0, 1.0);
}

function colour2id(colour) {
  return (colour[0] << (8 * 0)) |
         (colour[1] << (8 * 1)) |
         (colour[2] << (8 * 2));
}

function hsl2rgb(hsl) {
  var h = hsl[0];
  var s = hsl[1];
  var l = hsl[2];

  var hp = h / 60;
  var f = Math.floor(hp);
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(hp % 2 - 1));
  var m = l - 0.5 * c;

  var r = m;
  var g = m;
  var b = m;

  switch(f) {
    case 0:
      r += c;
      g += x;
      break;
    case 1:
      r += x;
      g += c;
      break;
    case 2:
      g += c;
      b += x;
      break;
    case 3:
      g += x;
      b += c;
      break;
    case 4:
      r += x;
      b += c;
      break;
    case 5:
      r += c;
      b += x;
      break;
  }

  return [r, g , b];
}

function elementOffset(element) {
  var x = 0;
  var y = 0;

  while (element != null){
    x += element.offsetTop;
    y += element.offsetLeft;
    element = element.parentElement;
  }
  return {x:x, y:y};
}

function distance3D(vec1, vec2) {
  return Math.sqrt(Math.pow(vec2[0]-vec1[0], 2) + Math.pow(vec2[1]-vec1[1], 2) + Math.pow(vec2[2]-vec1[2], 2))
}

function normalize3D(vec1, vec2) {
  let m = distance3D(vec1, vec2);
  return[((vec1[0]-vec2[0])/m)/400, ((vec1[1]-vec2[1])/m)/400, ((vec1[2]-vec2[2])/m)/400];
}
