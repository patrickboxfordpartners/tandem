import type { Env } from "../types";
import type { ProjectSpec } from "./planner";
import Stripe from "stripe";

interface PaymentsResult {
  customerId: string;
  productId: string;
  priceId: string;
  checkoutUrl: string;
}

export async function runPaymentsAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<PaymentsResult> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const customer = await stripe.customers.create({
    name: spec.name,
    metadata: { tandem_project_id: projectId, source: "tandem" },
  });

  const product = await stripe.products.create({
    name: spec.name,
    description: spec.description,
    metadata: { tandem_project_id: projectId },
  });

  let price: Stripe.Price;
  if (spec.subscription) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: spec.subscription.amount,
      currency: spec.subscription.currency,
      recurring: { interval: spec.subscription.interval },
    });
  } else if (spec.oneTimePrice) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: spec.oneTimePrice,
      currency: "usd",
    });
  } else {
    return { customerId: customer.id, productId: product.id, priceId: "", checkoutUrl: "" };
  }

  const session = await stripe.checkout.sessions.create({
    mode: spec.subscription ? "subscription" : "payment",
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: "https://tandem.patrick-54b.workers.dev/?success=true",
    cancel_url: "https://tandem.patrick-54b.workers.dev/?canceled=true",
    customer: customer.id,
    metadata: { tandem_project_id: projectId },
  });

  return {
    customerId: customer.id,
    productId: product.id,
    priceId: price.id,
    checkoutUrl: session.url || "",
  };
}
