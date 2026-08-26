import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { GLView } from "expo-gl";

type LiquidGlassNavProps = {
  width: number;
  height: number;
  activeIndex: number;
};

const VERTEX_SHADER = `
attribute vec2 a_position;

varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pillCenter;
uniform vec2 u_pillSize;

varying vec2 v_uv;

float roundedBox(
  vec2 p,
  vec2 b,
  float r
) {
  vec2 q = abs(p) - b + r;

  return length(max(q, 0.0))
    + min(max(q.x, q.y), 0.0)
    - r;
}

void main() {

  vec2 uv = v_uv;

  vec2 aspect = vec2(
    u_resolution.x / u_resolution.y,
    1.0
  );

  vec2 p = (uv - 0.5) * aspect;

  vec2 center =
    (u_pillCenter / u_resolution - 0.5)
    * aspect;

  vec2 size =
    u_pillSize / u_resolution.y;

  float d = roundedBox(
    p - center,
    size * 0.5,
    size.y * 0.5
  );

  float edge =
    1.0 -
    smoothstep(
      -0.02,
      0.02,
      d
    );

  float highlight =
    exp(
      -pow(
        (d + 0.01) * 60.0,
        2.0
      )
    );

  float shimmer =
    sin(
      uv.x * 20.0 +
      u_time * 1.5
    ) * 0.5 + 0.5;

  float chromatic =
    smoothstep(
      0.04,
      0.0,
      abs(d)
    );

  vec3 color = vec3(1.0);

  color +=
    highlight * 0.5;

  color += vec3(
    chromatic * 0.08,
    chromatic * 0.04,
    chromatic * 0.12
  );

  color +=
    shimmer *
    highlight *
    0.03;

  float alpha =
    edge * 0.16 +
    highlight * 0.12;

  gl_FragColor =
    vec4(color, alpha);
}
`;

function compileShader(
  gl: any,
  type: number,
  source: string
) {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error(
      "Unable to create shader"
    );
  }

  gl.shaderSource(
    shader,
    source
  );

  gl.compileShader(shader);

  if (
    !gl.getShaderParameter(
      shader,
      gl.COMPILE_STATUS
    )
  ) {
    const error =
      gl.getShaderInfoLog(shader);

    gl.deleteShader(shader);

    throw new Error(
      `Shader compilation failed: ${error}`
    );
  }

  return shader;
}

function createProgram(gl: any) {
  const vertexShader =
    compileShader(
      gl,
      gl.VERTEX_SHADER,
      VERTEX_SHADER
    );

  const fragmentShader =
    compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER
    );

  const program =
    gl.createProgram();

  if (!program) {
    throw new Error(
      "Unable to create GL program"
    );
  }

  gl.attachShader(
    program,
    vertexShader
  );

  gl.attachShader(
    program,
    fragmentShader
  );

  gl.linkProgram(program);

  if (
    !gl.getProgramParameter(
      program,
      gl.LINK_STATUS
    )
  ) {
    throw new Error(
      gl.getProgramInfoLog(program) ??
      "Program linking failed"
    );
  }

  return program;
}

const LiquidGlassNav: React.FC<
  LiquidGlassNavProps
> = ({
  width,
  height,
  activeIndex,
}) => {

  const animationFrame =
    useRef<number | null>(null);

  const currentX =
    useRef(0);

  const targetX =
    useRef(0);

  const time =
    useRef(0);

  const itemWidth =
    width / 4;

  useEffect(() => {
    targetX.current =
      itemWidth * activeIndex +
      itemWidth / 2;
  }, [
    activeIndex,
    itemWidth,
  ]);

  useEffect(() => {
    return () => {
      if (
        animationFrame.current !== null
      ) {
        cancelAnimationFrame(
          animationFrame.current
        );
      }
    };
  }, []);

  const onContextCreate =
    async (gl: any) => {

      const program =
        createProgram(gl);

      gl.useProgram(program);

      const vertices =
        new Float32Array([
          -1, -1,
           1, -1,
          -1,  1,

          -1,  1,
           1, -1,
           1,  1,
        ]);

      const buffer =
        gl.createBuffer();

      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        buffer
      );

      gl.bufferData(
        gl.ARRAY_BUFFER,
        vertices,
        gl.STATIC_DRAW
      );

      const position =
        gl.getAttribLocation(
          program,
          "a_position"
        );

      gl.enableVertexAttribArray(
        position
      );

      gl.vertexAttribPointer(
        position,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );

      const resolution =
        gl.getUniformLocation(
          program,
          "u_resolution"
        );

      const timeUniform =
        gl.getUniformLocation(
          program,
          "u_time"
        );

      const pillCenter =
        gl.getUniformLocation(
          program,
          "u_pillCenter"
        );

      const pillSize =
        gl.getUniformLocation(
          program,
          "u_pillSize"
        );

      const render = () => {

        /*
         * Smooth movement of
         * the glass pill.
         */
        currentX.current +=
          (
            targetX.current -
            currentX.current
          ) * 0.16;

        time.current += 0.016;

        gl.viewport(
          0,
          0,
          width,
          height
        );

        gl.clearColor(
          0,
          0,
          0,
          0
        );

        gl.clear(
          gl.COLOR_BUFFER_BIT
        );

        gl.uniform2f(
          resolution,
          width,
          height
        );

        gl.uniform1f(
          timeUniform,
          time.current
        );

        gl.uniform2f(
          pillCenter,
          currentX.current,
          height / 2
        );

        gl.uniform2f(
          pillSize,
          itemWidth - 8,
          height - 8
        );

        gl.drawArrays(
          gl.TRIANGLES,
          0,
          6
        );

        gl.endFrameEXP();

        animationFrame.current =
          requestAnimationFrame(
            render
          );
      };

      render();
    };

  return (
    <GLView
      style={StyleSheet.absoluteFill}
      onContextCreate={
        onContextCreate
      }
    />
  );
};

export default LiquidGlassNav;