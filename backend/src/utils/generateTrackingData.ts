import { addDays } from "date-fns";

//* Función para simular datos de seguimiento
export const generateTrackingData = async (order: any) => {
  const statusMap: any = {
    pending: "En preparación",
    processing: "En proceso",
    shipped: "En transito",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

  return {
    estimateDelivery: addDays(new Date(), 14),
    history: [
      {
        date: order.createdAt,
        status: "Confirmado",
        location: "Tienda del artesano",
        description: "El pedido fue recibido por el artesano",
      },
      {
        date: addDays(order.createdAt, 2),
        status: "En preparación",
        location: "Taller artesanal",
        description: "El artesano está preparando el pedido",
      },
      {
        date: addDays(order.createdAt, 4),
        status: "En tránsito",
        location: "Centro logístico",
        description: "El pedido fue entregado al transportista",
      },
      ...(order.status === "delivered"
        ? [
            {
              date: addDays(order.createdAt, 6),
              status: "Entregado",
              location: "Dirección del comprador",
              description: "El pedido fue entregado al cliente",
            },
          ]
        : []),
    ],
  };
};
