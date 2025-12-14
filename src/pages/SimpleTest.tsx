import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SimpleTest() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-8">
          Test Simple - Services Aéroport
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Test des composants UI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Compteur: {count}</p>
            <Button onClick={() => setCount(count + 1)}>
              Incrémenter
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
