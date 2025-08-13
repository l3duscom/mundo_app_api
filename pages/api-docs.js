import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "50vh",
      fontFamily: "Arial, sans-serif" 
    }}>
      <p>Carregando documentação da API...</p>
    </div>
  ),
});

export default function ApiDocs() {
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
        tryItOutEnabled={true}
      />
    </div>
  );
}
