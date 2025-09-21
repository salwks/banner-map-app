import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

const AdminControls = ({ isAdmin, searchText, setSearchText, onAdminToggle, onSearch }) => {
  return (
    <div className="fixed top-4 right-4 z-[1000] pointer-events-auto">
      <Card className="backdrop-blur-sm bg-white/95 shadow-lg">
        <CardContent className="p-3">
          <Button
            onClick={onAdminToggle}
            variant={isAdmin ? "default" : "outline"}
            size="sm"
            className="w-full mb-2"
            title={isAdmin ? "관리자 모드 활성" : "관리자 모드 비활성"}
          >
            <span className="mr-2">⚙️</span>
            {isAdmin ? "관리 모드" : "일반 모드"}
          </Button>

          {isAdmin && (
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="위치명 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="text-sm"
              />
              <Button
                onClick={onSearch}
                size="sm"
                className="w-full"
                variant="secondary"
              >
                이동
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminControls;