/**
 * Damped pendulum for the hanging visitor pass on the login page.
 *
 * The angle is in radians and uses the CSS rotation sense: 0 hangs straight down, positive turns
 * clockwise (the bottom swings to the left).
 */
export interface PendulumOptions {
  /** Pull back towards rest, per second squared. For a real pendulum this is gravity / length. */
  stiffness?: number;
  /** How quickly the swing dies out, per second. */
  damping?: number;
  /** Largest angle either side. */
  maxAngle?: number;
  /** Swing to keep going on its own, in radians either side. 0 lets the pendulum come to rest. */
  amplitude?: number;
}

/** How hard the drive works towards `amplitude`, per unit of energy difference. */
const DRIVE_GAIN = 400;
/** Limits on the drive, per second: how fast it can build a swing up, and how hard it can brake one. */
const MAX_BOOST = 2.5;
const MAX_BRAKE = 0.6;
/** A pendulum at rest has no motion to amplify, so the drive starts it with this nudge. */
const START_NUDGE = 0.05;

export class Pendulum {
  angle = 0;
  velocity = 0;
  stiffness: number;
  damping: number;
  amplitude: number;
  private readonly maxAngle: number;

  constructor({ stiffness = 9, damping = 0.9, maxAngle = 0.7, amplitude = 0 }: PendulumOptions = {}) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.maxAngle = maxAngle;
    this.amplitude = amplitude;
  }

  /** Advances the swing by `seconds`. Semi-implicit Euler, which stays stable at frame-sized steps. */
  step(seconds: number): void {
    let acceleration = -this.stiffness * Math.sin(this.angle) - this.damping * this.velocity;

    if (this.amplitude > 0) {
      if (Math.abs(this.angle) < 1e-3 && Math.abs(this.velocity) < 1e-3) this.velocity = START_NUDGE;
      // Pushes along the direction of motion while the swing has less energy than `amplitude`
      // needs, and against it while it has more, so the swing settles at that size.
      const energy = 0.5 * this.velocity ** 2 + this.stiffness * (1 - Math.cos(this.angle));
      const target = this.stiffness * (1 - Math.cos(this.amplitude));
      const drive = Math.min(MAX_BOOST, Math.max(-MAX_BRAKE, DRIVE_GAIN * (target - energy)));
      acceleration += drive * this.velocity;
    }

    this.velocity += acceleration * seconds;
    this.setAngle(this.angle + this.velocity * seconds);
  }

  /** Adds angular velocity, in radians per second. */
  push(velocity: number): void {
    this.velocity += velocity;
  }

  /** Holds the pendulum at `angle` while it is dragged. Velocity follows the hand, so a release keeps the throw. */
  hold(angle: number, seconds: number): void {
    const previous = this.angle;
    this.setAngle(angle);
    if (seconds > 0) this.velocity = (this.angle - previous) / seconds;
  }

  private setAngle(angle: number): void {
    const clamped = Math.min(this.maxAngle, Math.max(-this.maxAngle, angle));
    // Hitting the limit stops the swing there instead of letting velocity build up against it.
    if (clamped !== angle) this.velocity = 0;
    this.angle = clamped;
  }
}
