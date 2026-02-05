using System.ComponentModel.DataAnnotations.Schema;

namespace Learnio.Entities
{
    public class Message
    {
        public Guid Id { get; set; }
        public string Text { get; set; }
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;

        // Кто отправил
        public string SenderId { get; set; }
        [ForeignKey("SenderId")]
        public AppUser Sender { get; set; }

        // Кому отправили
        public string ReceiverId { get; set; }
        [ForeignKey("ReceiverId")]
        public AppUser Receiver { get; set; }
    }
}
