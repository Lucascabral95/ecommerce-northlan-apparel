import amqp from 'amqplib';

export type RabbitMqTopology = {
  readonly commandExchange: string;
  readonly deadLetterExchange: string;
  readonly eventExchange: string;
  readonly retryExchange: string;
};

export function getRabbitMqTopology(domain: string): RabbitMqTopology {
  return {
    commandExchange: `${domain}.commands.exchange`,
    deadLetterExchange: `${domain}.dead-letter.exchange`,
    eventExchange: `${domain}.events.exchange`,
    retryExchange: `${domain}.retry.exchange`,
  };
}

export async function assertRabbitMqTopology(rabbitmqUrl: string, domain: string): Promise<void> {
  const topology = getRabbitMqTopology(domain);
  const connection = await amqp.connect(rabbitmqUrl);
  const channel = await connection.createChannel();

  try {
    await channel.assertExchange(topology.commandExchange, 'direct', { durable: true });
    await channel.assertExchange(topology.eventExchange, 'topic', { durable: true });
    await channel.assertExchange(topology.retryExchange, 'direct', { durable: true });
    await channel.assertExchange(topology.deadLetterExchange, 'topic', { durable: true });

    await channel.assertQueue(`${domain}.dead-letter.queue`, {
      durable: true,
    });
    await channel.bindQueue(
      `${domain}.dead-letter.queue`,
      topology.deadLetterExchange,
      `${domain}.#`,
    );
  } finally {
    await channel.close();
    await connection.close();
  }
}
