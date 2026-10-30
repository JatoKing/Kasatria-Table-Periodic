import { describe, expect, it } from 'vitest';
import { Pendulum } from './pendulum';

function run(pendulum: Pendulum, seconds: number, step = 1 / 60): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) pendulum.step(step);
}

describe('Pendulum', () => {
  it('stays at rest when nothing moves it', () => {
    const pendulum = new Pendulum();
    run(pendulum, 2);
    expect(pendulum.angle).toBe(0);
    expect(pendulum.velocity).toBe(0);
  });

  it('swings after a push and settles back towards rest', () => {
    const pendulum = new Pendulum();
    pendulum.push(1);
    run(pendulum, 0.2);
    expect(pendulum.angle).toBeGreaterThan(0);

    // Damping 0.9 halves the swing roughly every 1.5 s.
    run(pendulum, 20);
    expect(Math.abs(pendulum.angle)).toBeLessThan(0.001);
  });

  it('settles faster with more damping', () => {
    const loose = new Pendulum({ damping: 0.9 });
    const held = new Pendulum({ damping: 6 });
    loose.push(1);
    held.push(1);
    run(loose, 1.5);
    run(held, 1.5);
    expect(Math.abs(held.angle)).toBeLessThan(Math.abs(loose.angle));
  });

  it('never passes the maximum angle', () => {
    const pendulum = new Pendulum({ maxAngle: 0.5 });
    pendulum.push(50);
    pendulum.step(1 / 60);
    expect(pendulum.angle).toBe(0.5);
    expect(pendulum.velocity).toBe(0);
  });

  it('starts swinging from rest and keeps the given amplitude', () => {
    const pendulum = new Pendulum({ amplitude: 0.1 });
    run(pendulum, 20);

    let widest = 0;
    for (let elapsed = 0; elapsed < 3; elapsed += 1 / 60) {
      pendulum.step(1 / 60);
      widest = Math.max(widest, Math.abs(pendulum.angle));
    }
    expect(widest).toBeGreaterThan(0.08);
    expect(widest).toBeLessThan(0.11);
  });

  it('brings a big swing back down to the given amplitude', () => {
    const pendulum = new Pendulum({ amplitude: 0.1 });
    pendulum.push(2);
    run(pendulum, 20);
    expect(Math.abs(pendulum.angle)).toBeLessThan(0.11);
  });

  it('comes to rest once the amplitude is set to 0', () => {
    const pendulum = new Pendulum({ amplitude: 0.1 });
    run(pendulum, 10);
    pendulum.amplitude = 0;
    pendulum.damping = 7;
    run(pendulum, 3);
    expect(Math.abs(pendulum.angle)).toBeLessThan(0.001);
  });

  it('keeps the throw speed when released from a drag', () => {
    const pendulum = new Pendulum();
    pendulum.hold(0.1, 1 / 60);
    pendulum.hold(0.2, 1 / 60);
    expect(pendulum.angle).toBe(0.2);
    expect(pendulum.velocity).toBeCloseTo(6, 5);
  });
});
