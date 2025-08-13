import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "50vh" 
    }}>
      <p>Carregando documentação da API...</p>
    </div>
  ),
});

export default function ApiDocs() {
  const [mounted, setMounted] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    setMounted(true);
    
    // Import CSS apenas em desenvolvimento
    if (typeof window !== "undefined" && isDev) {
      import("swagger-ui-react/swagger-ui.css");
    }
  }, [isDev]);

  // Em produção, mostrar mensagem informativa
  if (!isDev) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        padding: "20px"
      }}>
        <h1>📚 Documentação da API</h1>
        <p>A documentação Swagger está disponível apenas em ambiente de desenvolvimento.</p>
        <p>Para acessar a documentação:</p>
        <ol style={{ textAlign: "left", marginTop: "20px" }}>
          <li>Clone o repositório</li>
          <li>Execute <code style={{ backgroundColor: "#f0f0f0", padding: "2px 5px" }}>npm run dev</code></li>
          <li>Acesse <code style={{ backgroundColor: "#f0f0f0", padding: "2px 5px" }}>http://localhost:3000/api-docs</code></li>
        </ol>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "50vh" 
      }}>
        <p>Inicializando...</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <SwaggerUI 
        url="/api/swagger.json"
        deepLinking={true}
        displayOperationId={false}
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={1}
        defaultModelRendering="example"
        displayRequestDuration={true}
        docExpansion="list"
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
      />
    </div>
  );
}
