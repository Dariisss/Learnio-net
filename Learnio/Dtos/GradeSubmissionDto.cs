using System.ComponentModel.DataAnnotations;

namespace Learnio.Dtos
{
    public class GradeSubmissionDto
    {
        [Required]
        [Range(0, 100)]
        public int Grade { get; set; } // Оценка (0-100)

        public string? Comment { get; set; } // Комментарий учителя
    }
}