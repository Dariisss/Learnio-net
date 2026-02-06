using System.ComponentModel.DataAnnotations;

namespace Learnio.Dtos
{
    public class CreateMessageDto
    {
        [Required]
        [EmailAddress]
        public string SenderEmail { get; set; } // Кто пишет (Например, Студент)

        [Required]
        [EmailAddress]
        public string ReceiverEmail { get; set; } // Кому пишет (Например, Учитель)

        [Required]
        public string Text { get; set; } // Текст сообщения
    }
}