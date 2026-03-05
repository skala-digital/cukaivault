import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: process.env.GITHUB_SHA || 'local-dev',
    buildTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    nextVersion: process.env.npm_package_version || 'unknown',
  });
}
