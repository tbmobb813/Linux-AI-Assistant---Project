use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "lai")]
#[command(about = "Linux AI Assistant CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Send a message to the AI
    Ask {
        /// The question to ask
        message: String,
    },
    /// Get the last response
    Last,
}

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Ask { message } => {
            println!("Asking: {}", message);
            println!("CLI tool ready for implementation!");
        }
        Commands::Last => {
            println!("Getting last response...");
            println!("CLI tool ready for implementation!");
        }
    }
}
