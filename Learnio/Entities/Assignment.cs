using System.ComponentModel.DataAnnotations.Schema;

namespace Learnio.Entities
{
    public class Assignment
    {
        public Guid Id { get; set; }
        public string Title { get; set; } // Название задания
        public string? Description { get; set; } // Описание
        public DateTime Deadline { get; set; }
        public int MaxScore { get; set; }

        // Связь с курсом
        public Guid CourseId { get; set; }
        [ForeignKey("CourseId")]
        public Course Course { get; set; }
    }
}
