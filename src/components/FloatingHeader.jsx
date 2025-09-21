import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const FloatingHeader = ({ markerCount }) => {
  return (
    <div className="fixed top-4 left-4 z-[1000] pointer-events-auto">
      <Card className="w-80 backdrop-blur-sm bg-white/95 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold text-gray-800">
            현수막 설치 지도
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">총 현수막 수:</span>
            <span className="font-semibold text-lg text-blue-600">{markerCount}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <a
              href="mailto:stra2003@gmail.com"
              className="text-gray-500 hover:text-blue-600 transition-colors text-xs"
            >
              stra2003@gmail.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FloatingHeader;