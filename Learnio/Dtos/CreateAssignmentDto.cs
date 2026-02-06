using System.ComponentModel.DataAnnotations;

namespace Learnio.Dtos
{
    public class CreateAssignmentDto
    {
        [Required]
        public Guid CourseId { get; set; } // В какой курс добавляем задание

        [Required]
        public string Title { get; set; }

        public string? Description { get; set; }

        [Required]
        public DateTime Deadline { get; set; } // До какого числа сдать

        [Range(1, 100)]
        public int MaxScore { get; set; } // Максимальная оценка (например, 100)
    }
}