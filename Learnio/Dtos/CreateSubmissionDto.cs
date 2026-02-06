using System.ComponentModel.DataAnnotations;

namespace Learnio.Dtos
{
    public class CreateSubmissionDto
    {
        [Required]
        public Guid AssignmentId { get; set; } // На какое задание отвечаем

        [Required]
        public string StudentEmail { get; set; } // Кто отвечает (временно по Email)

        public string? TextAnswer { get; set; } // Текстовый ответ

        public string? FileLink { get; set; } // Ссылка на файл (Google Drive / Dropbox)
    }
}