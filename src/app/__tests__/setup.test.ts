/**
 * Setup Verification Tests
 * 
 * These tests verify that the Next.js project is properly initialized
 * with TypeScript, App Router, and Tailwind CSS.
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Project Setup Verification', () => {
  describe('Next.js Configuration', () => {
    it('should have Next.js 14+ installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      const nextVersion = packageJson.dependencies.next;
      const versionNumber = parseInt(nextVersion.replace(/[^\d]/g, '').slice(0, 2));
      
      expect(versionNumber).toBeGreaterThanOrEqual(14);
    });

    it('should have App Router structure', () => {
      const appDir = path.join(process.cwd(), 'src', 'app');
      const layoutExists = fs.existsSync(path.join(appDir, 'layout.tsx'));
      const pageExists = fs.existsSync(path.join(appDir, 'page.tsx'));
      
      expect(layoutExists).toBe(true);
      expect(pageExists).toBe(true);
    });

    it('should have next.config.js', () => {
      const configExists = fs.existsSync(
        path.join(process.cwd(), 'next.config.js')
      );
      
      expect(configExists).toBe(true);
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have TypeScript installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.dependencies.typescript).toBeDefined();
    });

    it('should have strict mode enabled', () => {
      const tsConfig = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8')
      );
      
      expect(tsConfig.compilerOptions.strict).toBe(true);
    });

    it('should have proper TypeScript configuration', () => {
      const tsConfig = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8')
      );
      
      expect(tsConfig.compilerOptions.jsx).toBeDefined();
      expect(tsConfig.compilerOptions.module).toBe('esnext');
      expect(tsConfig.compilerOptions.moduleResolution).toBe('bundler');
    });
  });

  describe('Tailwind CSS Configuration', () => {
    it('should have Tailwind CSS installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.dependencies.tailwindcss).toBeDefined();
    });

    it('should have tailwind.config.ts', () => {
      const configExists = fs.existsSync(
        path.join(process.cwd(), 'tailwind.config.ts')
      );
      
      expect(configExists).toBe(true);
    });

    it('should have postcss.config.js', () => {
      const configExists = fs.existsSync(
        path.join(process.cwd(), 'postcss.config.js')
      );
      
      expect(configExists).toBe(true);
    });

    it('should have globals.css with Tailwind directives', () => {
      const globalsPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
      const globalsExists = fs.existsSync(globalsPath);
      
      expect(globalsExists).toBe(true);
      
      if (globalsExists) {
        const content = fs.readFileSync(globalsPath, 'utf-8');
        // Check for Tailwind directives or Tailwind v4 import
        const hasTailwind = 
          content.includes('@tailwind') || 
          content.includes('@import "tailwindcss"');
        
        expect(hasTailwind).toBe(true);
      }
    });
  });

  describe('Project Structure', () => {
    it('should have src directory structure', () => {
      const srcDir = path.join(process.cwd(), 'src');
      const appDir = path.join(srcDir, 'app');
      
      expect(fs.existsSync(srcDir)).toBe(true);
      expect(fs.existsSync(appDir)).toBe(true);
    });

    it('should have package.json with required scripts', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.start).toBeDefined();
    });
  });
});
