import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const renderChart = async () => {
      if (!ref.current || !chart) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(false);
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        setError(true);
        // Clean up text if it failed (often happens if LLM outputs partial mermaid during streaming)
      }
    };

    renderChart();
  }, [chart]);

  if (error) return <div className="text-xs text-gray-400 p-2 border border-dashed border-gray-300 rounded">Rendering diagram...</div>;
  if (!svg) return <div className="animate-pulse h-24 bg-gray-100 rounded mb-4"></div>;

  return (
    <div 
      className="mermaid my-4 flex justify-center bg-white p-4 rounded-lg border border-notion-border shadow-sm overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

export default Mermaid;